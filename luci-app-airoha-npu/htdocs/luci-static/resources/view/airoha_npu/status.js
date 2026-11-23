'use strict';
'require view';
'require poll';
'require rpc';
'require ui';

var callNpuStatus = rpc.declare({ object: 'luci.airoha_npu', method: 'getStatus' });
var callPpeEntries = rpc.declare({ object: 'luci.airoha_npu', method: 'getPpeEntries' });
var callFrameEngine = rpc.declare({ object: 'luci.airoha_npu', method: 'getFrameEngine' });
var callSetGovernor = rpc.declare({ object: 'luci.airoha_npu', method: 'setGovernor', params: ['governor'] });
var callSetMaxFreq = rpc.declare({ object: 'luci.airoha_npu', method: 'setMaxFreq', params: ['freq'] });
var callSetOverclock = rpc.declare({ object: 'luci.airoha_npu', method: 'setOverclock', params: ['freq_mhz'] });

/* ── Theme-adaptive CSS (with dark mode + responsive + Argon optimization) ── */
var themeCSS = '\
.soc-card{background:var(--soc-card-bg);border:1px solid var(--soc-border);border-radius:8px;padding:14px;transition:border-color .3s,background-color .3s}\
.soc-card-accent{border-left-width:3px;border-left-style:solid}\
.soc-muted{color:var(--soc-muted)}\
.soc-text{color:var(--soc-text)}\
.soc-label{font-size:11px;color:var(--soc-muted)}\
.soc-bar-track{background:var(--soc-bar-track);border-radius:4px;overflow:hidden}\
.soc-fe-layout{display:flex;gap:12px;margin-bottom:10px;padding:0 8px;align-items:stretch}\
.soc-fe-left{flex:1;min-width:0;display:flex;flex-direction:column}\
.soc-fe-right{flex:1;min-width:0;display:flex;flex-direction:column}\
.soc-queue-bar{display:flex;gap:10px;font-size:11px;margin-top:auto;padding-top:6px;border-top:1px solid var(--soc-border)}\
/* Section spacing */\
.soc-section{margin-bottom:16px}\
.soc-section-title{font-size:15px;font-weight:600;margin-bottom:10px;color:var(--soc-text)}\
/* CPU frequency table row height consistency */\
#cpu-freq-table .tr{height:45px}\
#cpu-freq-table .td{vertical-align:middle;padding:6px 10px}\
#cpu-freq-table td:first-child{width:33%}\
#cpu-freq-table td:last-child{text-align:left}\
#cpu-freq-table select{height:auto;min-height:30px;padding:3px 8px;font-size:13px}\
#cpu-freq-table input[type="number"]{height:auto;min-height:30px;padding:3px 8px;font-size:13px}\
#cpu-freq-table button{height:auto;min-height:30px;padding:3px 12px;font-size:13px}\
/* NPU table row height consistency */\
#npu-table .tr{height:45px}\
#npu-table .td{vertical-align:middle;padding:6px 10px}\
#npu-table td:first-child{width:33%}\
#npu-table td:last-child{text-align:left}\
/* Overclock description inline */\
.soc-oc-desc{font-size:12px;color:var(--soc-muted);margin-left:8px;white-space:nowrap}\
/* PPE table responsive wrapper */\
.soc-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -1px}\
.soc-table-wrap .table{min-width:600px;margin-bottom:0}\
/* PPE 流表：固定百分比列宽，避免每次轮询随数据长度抖动；长字段自动折行保证完整显示 */\
#ppe-entries-table{width:100%;table-layout:fixed}\
#ppe-entries-table .th,#ppe-entries-table .td{text-align:center;vertical-align:middle;padding:5px 8px;font-size:12px}\
#ppe-entries-table th:nth-child(1){width:5%}\
#ppe-entries-table th:nth-child(2){width:5%}\
#ppe-entries-table th:nth-child(3){width:5%}\
#ppe-entries-table th:nth-child(4){width:45%}\
#ppe-entries-table th:nth-child(5){width:20%}\
#ppe-entries-table th:nth-child(6){width:20%}\
#ppe-entries-table td:nth-child(-n+3){white-space:nowrap}\
#ppe-entries-table td:nth-child(n+4){overflow-wrap:anywhere}\
/* NPU table (row height set above) */\
/* PPE 配置表：项目/值/说明 三列；值等宽，说明可折行 */\
#ppe-config-table{width:100%;table-layout:fixed}\
#ppe-config-table .tr{height:32px}\
#ppe-config-table .td,#ppe-config-table .th{vertical-align:middle;padding:4px 10px;text-align:left;font-size:12px;overflow-wrap:anywhere}\
#ppe-config-table th:nth-child(1){width:24%}\
#ppe-config-table th:nth-child(2){width:24%}\
#ppe-config-table th:nth-child(3){width:52%}\
#ppe-config-table td:nth-child(2){font-family:monospace;white-space:nowrap}\
#ppe-config-table td:nth-child(3){color:var(--soc-muted)}\
#ppe-config-table .ppe-cfg-group td{font-weight:600;font-size:12px;color:var(--soc-text);border-top:2px solid var(--soc-border);background:var(--soc-card-bg);padding-top:8px}\
/* FE card统一边框和最小高度 */\
.soc-fe-card{height:104px;display:flex;flex-direction:column}\
.soc-fe-gdm,.soc-fe-cdm,.soc-fe-ppe,.soc-fe-pse{border:1px solid var(--soc-border);border-radius:8px;padding:10px 12px;margin-bottom:10px;background:var(--soc-card-bg)}\
.soc-fe-ppe{border-left:3px solid #2196f3}\
/* PPE config details arrow rotation */\
#ppe-config-details[open] #ppe-config-arrow{transform:rotate(90deg)}\
/* Touch optimization */\
.soc-card select,.soc-card input,.soc-card button{min-height:36px}\
/* ── Responsive: Tablet ( < 768px ) ── */\
@media(max-width:768px){\
  .soc-fe-layout{flex-direction:column;gap:8px}\
  .soc-card{padding:12px}\
  #fe-diagram .soc-card{padding:10px 12px}\
}\
/* ── Responsive: Mobile ( < 480px ) ── */\
@media(max-width:480px){\
  .soc-card{padding:10px;border-radius:6px}\
  .soc-label{font-size:10px}\
  .soc-text{font-size:13px}\
  #cpu-freq-bar-wrap{flex-direction:column;align-items:stretch;gap:6px}\
  #cpu-freq-bar-wrap > span{text-align:center;font-size:11px}\
  #cpu-freq-bar-wrap > div{min-width:0;max-width:none}\
  .soc-card select,.soc-card input,.soc-card button{min-height:44px}\
}\
';

function isDarkMode() {
	// Sample multiple elements to get a reliable reading
	var els = [document.body, document.querySelector('.main-content'), document.querySelector('#maincontent'), document.querySelector('.cbi-map')];
	for (var i = 0; i < els.length; i++) {
		if (!els[i]) continue;
		var bg = window.getComputedStyle(els[i]).backgroundColor;
		var m = bg.match(/\d+/g);
		if (m && m.length >= 3) {
			var a = m.length >= 4 ? parseFloat(m[3]) : 1;
			if (a < 0.1) continue; // transparent, skip
			var lum = (parseInt(m[0]) * 299 + parseInt(m[1]) * 587 + parseInt(m[2]) * 114) / 1000;
			return lum < 128;
		}
	}
	// Fallback: check if any known dark theme stylesheet is loaded
	var sheets = document.querySelectorAll('link[href*="dark"], link[href*="glass"]');
	return sheets.length > 0;
}

function isArgonTheme() {
	// Detect Argon theme by checking for known classes or attributes (light or dark)
	var body = document.body;
	if (body.classList.contains('dark-theme') || body.classList.contains('argon-dark')) return true;
	if (body.classList.contains('light-theme') || body.classList.contains('argon-light')) return true;
	if (body.getAttribute('data-theme') === 'dark' || body.getAttribute('data-theme') === 'light') return true;
	// Check for Argon-specific CSS variables
	var testEl = document.createElement('div');
	testEl.style.display = 'none';
	document.body.appendChild(testEl);
	var cs = window.getComputedStyle(testEl);
	var hasArgonVar = cs.getPropertyValue('--argon-primary') !== '' || cs.getPropertyValue('--primary-color') !== '';
	document.body.removeChild(testEl);
	return hasArgonVar;
}

var _lastDarkMode = null;
var _lastIsArgon = null;

function injectCSS() {
	var el = document.getElementById('soc-theme-css');
	if (!el) { el = document.createElement('style'); el.id = 'soc-theme-css'; document.head.appendChild(el); }
	var dark = isDarkMode();
	var argon = isArgonTheme();
	if (dark === _lastDarkMode && argon === _lastIsArgon) return;
	_lastDarkMode = dark;
	_lastIsArgon = argon;

	var vars;
	if (dark) {
		if (argon) {
			// Argon dark theme - optimized for Argon's visual language
			vars = ':root{' +
				'--soc-card-bg:#1c1c1e;' +
				'--soc-border:#2c2c2e;' +
				'--soc-muted:#8e8e93;' +
				'--soc-text:#e5e5ea;' +
				'--soc-bar-track:#2c2c2e;' +
				'--soc-table-header-bg:#2c2c2e;' +
				'--soc-table-border:#2c2c2e;' +
				'}';
		} else {
			// Generic dark theme
			vars = ':root{' +
				'--soc-card-bg:#1a1a1a;' +
				'--soc-border:#333;' +
				'--soc-muted:#9e9e9e;' +
				'--soc-text:#e8e8e8;' +
				'--soc-bar-track:#2d2d2d;' +
				'--soc-table-header-bg:#252525;' +
				'--soc-table-border:#333;' +
				'}';
		}
	} else {
		// Light mode - keep clean and bright
		vars = ':root{' +
			'--soc-card-bg:#ffffff;' +
			'--soc-border:#e0e0e0;' +
			'--soc-muted:#757575;' +
			'--soc-text:#212121;' +
			'--soc-bar-track:#eeeeee;' +
			'--soc-table-header-bg:#fafafa;' +
			'--soc-table-border:#e0e0e0;' +
			'}';
	}
	el.textContent = themeCSS + vars;
}

/* ── Helpers ── */

function fmtFreq(khz) { return (!khz || khz === 0) ? 'N/A' : (khz / 1000).toFixed(0) + ' MHz'; }
function fmtK(n) {
	if (!n || n === 0) return '0';
	if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
	if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
	return n.toString();
}
function calcTotalMem(regions) {
	var t = 0;
	(regions || []).forEach(function(r) {
		var m = (r.size || '').match(/(\d+)\s*(KiB|MiB|GiB)/i);
		if (m) { var s = parseInt(m[1]); var u = m[2][0].toUpperCase(); t += u === 'G' ? s*1048576 : u === 'M' ? s*1024 : s; }
	});
	return t >= 1024 ? (t/1024).toFixed(0)+' MiB' : t+' KiB';
}


/* ── Frame Engine Diagram (NPU, PPE, and Ethernet offload) ── */
// 跨轮询保存上一次帧引擎计数，供 CDM 计算实时区间卸载率（每 5 秒轮询一次）。
var _prevFe = null;
// 上一次 PPE 配置内容指纹：配置变化（驱动重载/接口增删）时重建配置表。
var _ppeCfgKey = null;
function renderFeDiagram(fe, st) {
	st = st || {};
	if (!fe || fe.error) return E('div', { 'class': 'soc-muted' }, _('devmem not available on this build'));
	var ports = Array.isArray(fe.pse_ports) ? fe.pse_ports : [];

	// Helper: GDM card with PSE queue info
	// PSE 端口号与上游驱动 enum fe_pse_port 一致：CDM1=0、GDM1=1、GDM2=2、GDM3=3、
	// PPE1=4、CDM2=5、CDM3=6、CDM4=7、PPE2=8、GDM4=9，即 0x150+i*4 / 0x120+i*4 的下标。
	function gdmCard(key, name, label, color, psePort) {
		var d = fe[key] || {};
		var prev = (_prevFe && _prevFe[key]) ? _prevFe[key] : null;
		var pq = psePort != null ? ports.find(function(p){ return p.port === psePort; }) : null;
		var prevPorts = (_prevFe && Array.isArray(_prevFe.pse_ports)) ? _prevFe.pse_ports : [];
		var ppq = psePort != null ? prevPorts.find(function(p){ return p.port === psePort; }) : null;
		// DMA 丢包 = 同一 COUNT 块的 5 类计数之和；累计值保持常态色，本区间有新增才在数字后追加红色 +N。
		var drop = (d.tx_drop||0) + (d.rx_fc_drop||0) + (d.rx_rc_drop||0) + (d.rx_over_drop||0) + (d.rx_err_drop||0);
		var dropPrev = prev ? (prev.tx_drop||0) + (prev.rx_fc_drop||0) + (prev.rx_rc_drop||0) + (prev.rx_over_drop||0) + (prev.rx_err_drop||0) : 0;
		var dropDelta = prev ? drop - dropPrev : 0;
		var dropTip = _('开机累计（DMA 计数块）') + '\n' +
			_('发送丢弃: ') + (d.tx_drop||0) + '\n' +
			_('接收流控: ') + (d.rx_fc_drop||0) + '\n' +
			_('接收限速: ') + (d.rx_rc_drop||0) + '\n' +
			_('接收溢出: ') + (d.rx_over_drop||0) + '\n' +
			_('接收错误: ') + (d.rx_err_drop||0);
		var qd = pq ? (pq.drops||0) : 0;
		var qdDelta = ppq ? qd - (ppq.drops||0) : 0;
		return E('div', { 'class': 'soc-fe-gdm soc-fe-card', 'style': 'border-left:3px solid '+color }, [
			E('div', { 'style': 'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px' }, [
				E('span', { 'style': 'font-weight:bold;color:'+color+';font-size:14px' }, name),
				E('span', { 'class': 'soc-label' }, 'P'+psePort)
			]),
			E('div', { 'class': 'soc-label', 'style': 'margin-bottom:6px' }, label),
			E('div', { 'style': 'display:flex;align-items:center;min-height:20px;font-size:12px;margin-bottom:4px' }, [
				E('span', { 'style': 'flex:1' }, [E('span', { 'class': 'soc-muted' }, _('发送: ')), E('span', { 'class': 'soc-text' }, fmtK(d.tx))]),
				E('span', { 'style': 'flex:1' }, [E('span', { 'class': 'soc-muted' }, _('接收: ')), E('span', { 'class': 'soc-text' }, fmtK(d.rx))]),
				E('span', { 'style': 'flex:1', 'title': dropTip }, [
					E('span', { 'class': 'soc-muted' }, _('DMA丢包: ')),
					E('span', { 'class': 'soc-text' }, fmtK(drop)),
					dropDelta > 0 ? E('span', { 'style': 'color:#f44336;margin-left:4px' }, '+'+fmtK(dropDelta)) : null
				])
			]),
			pq ? E('div', { 'style': 'display:flex;align-items:center;min-height:20px;font-size:12px' }, [
				E('span', { 'style': 'flex:1' }, [E('span', { 'class': 'soc-muted' }, _('入队占用: ') + pq.iq)]),
				E('span', { 'style': 'flex:1' }, [E('span', { 'class': 'soc-muted' }, _('出队占用: ') + pq.oq)]),
				E('span', { 'style': 'flex:1', 'title': _('PSE 端口 P') + psePort + _(' 队列丢弃（开机累计）') }, qd > 0 ? [
					E('span', { 'class': 'soc-muted' }, _('队列丢包: ')),
					E('span', { 'class': 'soc-text' }, fmtK(qd)),
					qdDelta > 0 ? E('span', { 'style': 'color:#f44336;margin-left:4px' }, '+'+fmtK(qdDelta)) : null
				] : [])
			]) : null
		]);
	}

	// Helper: CDM card with PSE queue info（卸载率已移至顶部并列展示）
	function cdmCard(key, name, label, psePort) {
		var d = fe[key] || {};
		var prev = (_prevFe && _prevFe[key]) ? _prevFe[key] : null;
		var pq = psePort != null ? ports.find(function(p){ return p.port === psePort; }) : null;
		// CDM 丢包 = CPU 路径 + 硬件转发路径。实测 RXHWF_DROP 已含 FAST 子集（CDM1 两计数恒等，0x2CB=0x2CB），
		// FAST 丢包只作明细展示，不叠加，否则重复计数。累计值保持常态色，新增量用红色 +N 标注。
		var drop = (d.rx_cpu_drop||0) + (d.rx_hwf_drop||0);
		var dropPrev = prev ? (prev.rx_cpu_drop||0) + (prev.rx_hwf_drop||0) : 0;
		var dropDelta = prev ? drop - dropPrev : 0;
		var dropTip = _('开机累计') + '\n' +
			_('CPU 收包丢弃: ') + (d.rx_cpu_drop||0) + '\n' +
			_('硬件转发丢弃: ') + (d.rx_hwf_drop||0) + '\n' +
			_('其中 FAST 路径: ') + (d.rx_hwf_fast_drop||0) + _('（已含上项）');
		return E('div', { 'class': 'soc-fe-cdm soc-fe-card', 'style': 'border-left:3px solid #607d8b' }, [
			E('div', { 'style': 'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px' }, [
				E('span', { 'style': 'font-weight:bold;color:#607d8b;font-size:14px' }, name),
				E('span', { 'class': 'soc-label' }, 'P'+psePort)
			]),
			E('div', { 'class': 'soc-label', 'style': 'margin-bottom:6px' }, label),
			E('div', { 'style': 'display:flex;align-items:center;min-height:20px;font-size:12px;margin-bottom:4px' }, [
				E('span', { 'style': 'flex:1' }, [E('span', { 'class': 'soc-muted' }, _('CPU转发: ') + fmtK(d.rx_cpu||0))]),
				E('span', { 'style': 'flex:1' }, [E('span', { 'class': 'soc-muted' }, _('硬件转发: ') + fmtK((d.rx_hwf||0)+(d.rx_hwf_fast||0)))]),
				E('span', { 'style': 'flex:1' }, [E('span', { 'class': 'soc-muted' }, _('发送: ') + fmtK(d.tx||0))])
			]),
			// 队列占用为 PSE 瞬时状态（128B 页），非累计包数；丢包为 CDM 自身 RXCPU+RXHWF 累计（HWF 含 FAST），新增量以红色 +N 标注。
			E('div', { 'style': 'display:flex;align-items:center;min-height:20px;font-size:12px' }, [
				E('span', { 'style': 'flex:1' }, pq ? [E('span', { 'class': 'soc-muted' }, _('入队占用: ') + pq.iq)] : []),
				E('span', { 'style': 'flex:1' }, pq ? [E('span', { 'class': 'soc-muted' }, _('出队占用: ') + pq.oq)] : []),
				E('span', { 'style': 'flex:1', 'title': dropTip }, [
					E('span', { 'class': 'soc-muted' }, _('丢包: ')),
					E('span', { 'class': 'soc-text' }, fmtK(drop)),
					dropDelta > 0 ? E('span', { 'style': 'color:#f44336;margin-left:4px' }, '+'+fmtK(dropDelta)) : null
				])
			])
		]);
	}


	// PSE 缓冲池占用按 FQ 描述符池计算：FQ_CFG=总数、FQ_STA=空闲数。
	// 0x104（SHARE_BUF_STA）高位在 AN7581 上不回落到真实占用，实测常驻且超过池容量，不能用来算百分比。
	var fqLimit = fe.fq_limit||0, fqFree = fe.fq_free||0;
	var fqUsed = fqLimit>0 ? Math.max(0, fqLimit-fqFree) : 0;
	var pseP = fqLimit>0 ? (fqUsed/fqLimit*100).toFixed(1) : '0';
	var pseCol = parseFloat(pseP)>80?'#f44336':parseFloat(pseP)>50?'#ff9800':'#4caf50';

	// 硬件实时转发：CDM1(LAN 侧)/CDM2(WAN 侧) 各取两次轮询的 RXHWF/RXCPU 计数增量之比（实时区间率），非开机累计。
	// _prevFe 为空=首轮无基准；计数回退=驱动重载/回绕：都显示“采样中”。
	function feRate(key) {
		var c = fe[key] || {};
		var p = (_prevFe && _prevFe[key]) ? _prevFe[key] : null;
		var r = { pct: 0, text: _('采样中'), col: 'var(--soc-border)' };
		if (!p) return r;
		var dcpu = (c.rx_cpu||0) - (p.rx_cpu||0);
		// 硬件转发包含两套机制：CDM1 的 LAN↔LAN 桥接走 RXHWF_FAST（0x598），CDM2 的 WAN 路由/PPE 走 RXHWF_OK（0x594）。
		// 单一 CDM 上二者互斥（实测 CDM1 的 OK 恒 0、CDM2 的 FAST 恒 0），故求和不会重复计。
		var dhwf = ((c.rx_hwf||0)+(c.rx_hwf_fast||0)) - ((p.rx_hwf||0)+(p.rx_hwf_fast||0));
		if (dcpu < 0 || dhwf < 0) return r;
		var tot = dcpu + dhwf;
		if (tot === 0) { r.text = _('空闲'); return r; }
		r.pct = dhwf / tot * 100;
		r.text = r.pct.toFixed(1) + '%';
		r.col = r.pct > 80 ? '#4caf50' : r.pct > 50 ? '#ff9800' : '#9e9e9e';
		return r;
	}
	var rCdm1 = feRate('cdm1');
	var rCdm2 = feRate('cdm2');

	// PPE 卡片：两端合计的硬件转发占比（区间增量加权，非两条进度条平均）。
	function feRateAll() {
		var keys = ['cdm1', 'cdm2'];
		var c1 = fe.cdm1 || {}, c2 = fe.cdm2 || {};
		var p1 = (_prevFe && _prevFe.cdm1) || null, p2 = (_prevFe && _prevFe.cdm2) || null;
		if (!p1 || !p2) return { text: _('采样中') };
		var r = function(o, k) { return o[k] || 0; };
		var dcpu = (r(c1,'rx_cpu')+r(c2,'rx_cpu')) - (r(p1,'rx_cpu')+r(p2,'rx_cpu'));
		var hwf = function(o) { return r(o,'rx_hwf') + r(o,'rx_hwf_fast'); };
		var dhwf = (hwf(c1)+hwf(c2)) - (hwf(p1)+hwf(p2));
		if (dcpu < 0 || dhwf < 0) return { text: _('采样中') };
		var tot = dcpu + dhwf;
		if (tot === 0) return { text: _('空闲') };
		return { text: (dhwf / tot * 100).toFixed(1) + '%' };
	}
	var rAll = feRateAll();

	// PPE engines card
	var ppeCard = E('div', { 'class': 'soc-fe-ppe soc-fe-card' }, [
		E('div', { 'style': 'display:flex;justify-content:space-between;align-items:center;margin-bottom:2px' }, [
			E('span', { 'style': 'font-weight:bold;color:#2196f3;font-size:14px' }, 'PPE ' + _('引擎')),
			E('span', { 'class': 'soc-label' }, 'P4 / P8')
		]),
		E('div', { 'style': 'display:flex;align-items:center;min-height:20px;font-size:12px;flex:1' }, [
			E('span', { 'style': 'flex:1' }, [
				E('span', { 'class': 'soc-muted' }, _('已绑定: ')),
				E('span', { 'class': 'soc-text', 'style': 'font-weight:bold', 'id': 'fe-ppe-bound' }, (st.offload_bound||0).toString())
			]),
			E('span', { 'style': 'flex:1' }, [
				E('span', { 'class': 'soc-muted' }, _('总计: ')),
				E('span', { 'class': 'soc-text', 'id': 'fe-ppe-total' }, (st.offload_total||0).toString())
			]),
			E('span', { 'style': 'flex:1' }, [
				E('span', { 'class': 'soc-muted' }, _('硬件转发: ')),
				E('span', { 'class': 'soc-text', 'id': 'fe-hwf-rate' }, rAll.text)
			])
		])
	]);

	// 顶部进度条：PSE 共享缓冲区 | CDM1 硬件实时转发 | CDM2 硬件实时转发；窄屏 flex-wrap 自动换行。
	function rateBar(title, r) {
		return E('div', { 'class': 'soc-fe-pse', 'style': 'flex:1 1 220px;min-width:0' }, [
			E('div', { 'style': 'display:flex;justify-content:space-between;margin-bottom:4px' }, [
				E('span', { 'class': 'soc-text', 'style': 'font-weight:bold;font-size:13px' }, title),
				E('span', { 'class': 'soc-muted', 'style': 'font-size:12px' }, r.text)
			]),
			E('div', { 'class': 'soc-bar-track', 'style': 'height:8px' }, [
				E('div', { 'style': 'background:'+r.col+';height:100%;width:'+r.pct+'%;border-radius:4px;transition:width .5s' })
			])
		]);
	}

	var diagram = E('div', { 'id': 'fe-diagram' }, [
		E('div', { 'style': 'display:flex;gap:12px;flex-wrap:wrap;margin:0 8px 10px' }, [
			E('div', { 'class': 'soc-fe-pse', 'style': 'flex:1 1 220px;min-width:0' }, [
				E('div', { 'style': 'display:flex;justify-content:space-between;margin-bottom:4px' }, [
					E('span', { 'class': 'soc-text', 'style': 'font-weight:bold;font-size:13px' }, _('PSE 共享缓冲区')),
					E('span', { 'class': 'soc-muted', 'style': 'font-size:12px' }, fqUsed + ' / ' + fqLimit + _(' 已用 (') + pseP + '%)')
				]),
				E('div', { 'class': 'soc-bar-track', 'style': 'height:8px' }, [
					E('div', { 'style': 'background:'+pseCol+';height:100%;width:'+pseP+'%;border-radius:4px;transition:width .5s' })
				])
			]),
			rateBar(_('CDM1 硬件实时转发'), rCdm1),
			rateBar(_('CDM2 硬件实时转发'), rCdm2)
		]),
		// 双栏: 左 GDM 端口 | 右 CDM + PPE
		E('div', { 'class': 'soc-fe-layout' }, [
			E('div', { 'class': 'soc-fe-left' }, [
				gdmCard('gdm2', 'PON & WAN', 'GDM2 (USXGMII 10G)', '#4caf50', 2),
				gdmCard('gdm4', 'LAN1', 'GDM4 (EN8811H 2.5G)', '#ff9800', 9),
				gdmCard('gdm1', 'LAN2/3/4', 'GDM1 (内部交换 1G)', '#ff9800', 1),
				st.wifi_present ? gdmCard('gdm3', 'WiFi', 'GDM3 (WiFi DMA)', '#9c27b0', 3) : null
			]),
			E('div', { 'class': 'soc-fe-right' }, [
				cdmCard('cdm1', 'CDM1', _('LAN 侧 CPU-DMA'), 0),
				cdmCard('cdm2', 'CDM2', _('WAN 侧 CPU-DMA'), 5),
				ppeCard
			])
		])
	]);
	// 必须在卡片构建之后更新基准，下次轮询才能与本次快照做差。
	_prevFe = fe;
	return diagram;
}

/* ── CPU Frequency ── */
function freqBarState(hw, min, max, pll, gov, freqSource) {
	var oc = gov==='performance' && pll>0 && (pll*1000)>max;
	return { freq: oc ? pll*1000 : Math.min(hw,max), max: oc ? pll*1000 : max, oc: oc, source: freqSource || 'cpufreq' };
}
function renderFreqBar(hw, min, max, pll, gov, freqSource) {
	if (!max) return E('span',{},'N/A');
	var s = freqBarState(hw,min,max,pll,gov,freqSource);
	var pct = Math.round(((s.freq-min)/(s.max-min))*100);
	pct = Math.max(0,Math.min(100,pct));
	var bg = s.oc ? 'linear-gradient(90deg,#e65100,#ff9800)' : 'linear-gradient(90deg,#2e7d32,#66bb6a)';
	var label = s.oc ? (pll+' MHz (OC)') : fmtFreq(s.freq);
	// PLL fallback indicator
	var pllBadge = '';
	if (s.source === 'pll') {
		pllBadge = ' <span style="background:#ff9800;color:#fff;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:600;margin-left:6px;">' + _('PLL Estimate') + '</span>';
	}
	return E('div', { 'id':'cpu-freq-bar-wrap', 'style':'display:flex;align-items:center;gap:10px' }, [
		E('span', { 'class':'soc-muted', 'style':'font-size:90%' }, fmtFreq(min)),
		E('div', { 'style':'flex:1;border-radius:4px;height:22px;position:relative;min-width:180px;max-width:350px;overflow:hidden', 'class':'soc-bar-track' }, [
			E('div', { 'id':'cpu-freq-fill', 'style':'background:'+bg+';height:100%;border-radius:4px;width:'+pct+'%;transition:width .5s' }),
			E('span', { 'id':'cpu-freq-text', 'style':'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.6)' }, 
				E('span', { 'id': 'cpu-freq-label' }, label + pllBadge)
			)
		]),
		E('span', { 'id':'cpu-freq-max-label', 'class':'soc-muted', 'style':'font-size:90%' }, fmtFreq(s.max))
	]);
}
function updateFreqBar(hw, min, max, pll, gov, freqSource) {
	var s = freqBarState(hw,min,max,pll,gov,freqSource);
	var el = document.getElementById('cpu-freq-label'), fl = document.getElementById('cpu-freq-fill'), ml = document.getElementById('cpu-freq-max-label');
	if (el) {
		var label = s.oc ? (pll+' MHz (OC)') : fmtFreq(s.freq);
		var pllBadge = s.source === 'pll' ? ' <span style="background:#ff9800;color:#fff;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:600;margin-left:6px;">' + _('PLL Estimate') + '</span>' : '';
		el.innerHTML = label + pllBadge;
	}
	if (fl && s.max>0) { var pct=Math.max(0,Math.min(100,Math.round(((s.freq-min)/(s.max-min))*100))); fl.style.width=pct+'%'; fl.style.background=s.oc?'linear-gradient(90deg,#e65100,#ff9800)':'linear-gradient(90deg,#2e7d32,#66bb6a)'; }
	if (ml) ml.textContent = fmtFreq(s.max);
}

var govNameMap = {
	'performance': '性能模式',
	'ondemand': '按需调度',
	'schedutil': '调度器',
	'powersave': '节能模式',
	'conservative': '保守模式',
	'userspace': '用户空间'
};
function renderGovSelect(avail, active) {
	var gs = (avail||'').trim().split(/\s+/).filter(Boolean);
	if (!gs.length) return E('span',{},'N/A');
	return E('select', { 'id':'cpu-governor-select','class':'cbi-input-select','style':'min-width:160px','change':function(ev){
		var g=ev.target.value; ev.target.disabled=true;
		callSetGovernor(g).then(function(r){ev.target.disabled=false;if(r&&r.error) ui.addNotification(null,E('p',{},_('Error: ')+r.error),'error');}).catch(function(){ev.target.disabled=false;});
	}}, gs.map(function(g){
		var label = govNameMap[g] ? (govNameMap[g]+' ('+g+')') : g;
		return E('option',{'value':g,'selected':g===active?'':null},label);
	}));
}
function renderMaxFreqSelect(avail, cur) {
	var fs = (avail||'').trim().split(/\s+/).filter(Boolean);
	if (!fs.length) return E('span',{},'N/A');
	return E('select', { 'id':'cpu-maxfreq-select','class':'cbi-input-select','style':'min-width:140px','change':function(ev){
		var f=ev.target.value; ev.target.disabled=true;
		callSetMaxFreq(parseInt(f)).then(function(r){ev.target.disabled=false;if(r&&r.error) ui.addNotification(null,E('p',{},_('Error: ')+r.error),'error');}).catch(function(){ev.target.disabled=false;});
	}}, fs.map(function(f){return E('option',{'value':f,'selected':parseInt(f)===parseInt(cur)?'':null},(parseInt(f)/1000).toFixed(0)+' MHz');}));
}
function renderOcControls() {
	var inp = E('input',{'id':'oc-freq-input','type':'number','min':'500','max':'1600','step':'50','value':'1400','class':'cbi-input-text','style':'width:100px'});
	var btn = E('button',{'class':'cbi-button cbi-button-action','style':'margin-left:8px','click':function(){
		var f=parseInt(document.getElementById('oc-freq-input').value);
		if(isNaN(f)||f<500||f>1600){ui.addNotification(null,E('p',{},_('Frequency must be 500-1600 MHz')),'error');return;}
		if(f>1400&&!confirm(_('Frequencies above 1400 MHz may be unstable. Continue?'))) return;
		btn.disabled=true;btn.textContent=_('Applying...');
		callSetOverclock(f).then(function(r){btn.disabled=false;btn.textContent=_('Apply');
			if(r&&r.error) ui.addNotification(null,E('p',{},_('Overclock failed: ')+r.error),'error');
			else if(r&&r.result==='ok') ui.addNotification(null,E('p',{},_('CPU set to ')+r.actual_mhz+' MHz'),'info');
		}).catch(function(e){btn.disabled=false;btn.textContent=_('Apply');});
	}},_('Apply'));
	return E('div',{'style':'display:flex;align-items:center;gap:8px;flex-wrap:wrap'},[
		inp, E('span',{'class':'soc-muted'},'MHz'), btn,
		E('span',{'class':'soc-oc-desc'},_('直接写入 PLL 寄存器。调频策略锁定为性能模式。标称最高 1200 MHz，实测 1500 MHz 稳定。'))
	]);
}

/* ── PPE Config Table ──
   数据来自 /sys/kernel/debug/ppe/config（驱动原样输出），这里只做展示层翻译：
   寄存器键 -> 中文项目名、十六进制补 0x、端口号 -> PSE 端口名，并合入同目录 bind_rate 的绑定上限。
   未登记的新字段落到"其他"分组原样显示，保证不丢信息。 */
var PPE_PORT_NAMES = {0:'CDM1',1:'GDM1',2:'GDM2',3:'GDM3',4:'PPE1',5:'CDM2',6:'CDM3',7:'CDM4',8:'PPE2',9:'GDM4'};

// 端口下标即上游 enum fe_pse_port。
function ppePortName(n) {
	return PPE_PORT_NAMES[n] ? n + '（' + PPE_PORT_NAMES[n] + '）' : String(n);
}

function ppeHex(val) {
	return /^[0-9a-fA-F]{8}$/.test(val) ? '0x' + val.toLowerCase() : val;
}

// 端口使能掩码：低 8 位逐位对应 PSE 端口 0-7，高 24 位为保留位。
function ppePortMaskDesc(val) {
	if (!/^[0-9a-fA-F]{8}$/.test(val)) return '端口使能掩码';
	var low = parseInt(val, 16) & 0xff, ports = [];
	for (var bit = 0; bit < 8; bit++)
		if (low & (1 << bit)) ports.push('端口 ' + ppePortName(bit));
	var head = '低 8 位 0x' + ('0' + low.toString(16)).slice(-2);
	return ports.length ? head + ' → ' + ports.join('、') + ' 使能；高 24 位为保留位' : head + '：无端口使能；高 24 位为保留位';
}

var PPE_CFG_META = {
	npu_attached: {label:'NPU 挂载', desc:function(v){ return v === '1' ? '是，NPU 驱动已与硬件转发引擎协同' : '否'; }},
	gdm2_fwd_cfg: {label:'GDM2 转发配置', desc:function(){ return 'WAN 侧 DMA 转发配置寄存器原值'; }},
	fe_wan_port: {label:'WAN 口', desc:function(v){ return 'PSE 端口 ' + ppePortName(parseInt(v, 16)) + '，转发引擎认定的 WAN 侧 DMA'; }},
	fe_vip_port_en: {label:'VIP 端口使能', desc:ppePortMaskDesc},
	fe_ifc_port_en: {label:'IFC 端口使能', desc:ppePortMaskDesc},
	ppe0_flow_cfg: {label:'PPE0 流表配置', desc:function(){ return '控制 PPE0 硬件转发的匹配行为'; }},
	ppe0_table_cfg: {label:'PPE0 表配置', desc:function(){ return 'PPE0 流表基址、容量等布局参数'; }},
	ppe0_gdm2_default_cpu_port: {label:'PPE0 GDM2 默认 CPU 端口', desc:function(v){ return 'PSE 端口 ' + ppePortName(parseInt(v, 10)) + '，WAN 流未命中硬件转发时交给该 CPU DMA'; }},
	ppe1_flow_cfg: {label:'PPE1 流表配置', desc:function(){ return '控制 PPE1 硬件转发的匹配行为'; }},
	ppe1_table_cfg: {label:'PPE1 表配置', desc:function(){ return 'PPE1 流表基址、容量等布局参数'; }},
	ppe1_gdm2_default_cpu_port: {label:'PPE1 GDM2 默认 CPU 端口', desc:function(v){ return 'PSE 端口 ' + ppePortName(parseInt(v, 10)) + '，WAN 流未命中硬件转发时交给该 CPU DMA'; }}
};

// 分组顺序即展示顺序；缺字段的分组整块略过。
var PPE_CFG_GROUPS = [
	{title:'全局', keys:['npu_attached', 'fe_wan_port', 'fe_vip_port_en', 'fe_ifc_port_en']},
	{title:'WAN 侧 DMA（GDM2）', keys:['gdm2_fwd_cfg']},
	{title:'PPE0 硬件转发引擎', keys:['ppe0_flow_cfg', 'ppe0_table_cfg', 'ppe0_gdm2_default_cpu_port'], ppe:'ppe0'},
	{title:'PPE1 硬件转发引擎', keys:['ppe1_flow_cfg', 'ppe1_table_cfg', 'ppe1_gdm2_default_cpu_port'], ppe:'ppe1'}
];

function parsePpeConfig(config) {
	var map = {}, order = [];
	(config || '').split('\n').forEach(function(line) {
		line = line.trim();
		var pos = line.indexOf(':');
		if (pos < 1) return;
		var key = line.slice(0, pos).trim(), val = line.slice(pos + 1).trim();
		if (!key) return;
		map[key] = val;
		order.push(key);
	});
	return {map:map, order:order};
}

// bind_rate 形如 "ppe0: l2b=30 l3=30"，表示每类表可绑定的条目上限。
function parseBindRate(text) {
	var res = {};
	(text || '').split('\n').forEach(function(line) {
		var m = /^\s*([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(line);
		if (!m) return;
		var kv = {};
		m[2].split(/\s+/).forEach(function(pair) {
			var p = pair.split('=');
			if (p.length === 2) kv[p[0]] = p[1];
		});
		res[m[1]] = kv;
	});
	return res;
}

function ppeCfgRow(label, val, desc) {
	return E('tr',{'class':'tr'},[
		E('td',{'class':'td'}, label),
		E('td',{'class':'td'}, val),
		E('td',{'class':'td'}, desc || '')
	]);
}

function renderPpeConfigRows(config, bindRateText) {
	var parsed = parsePpeConfig(config), binds = parseBindRate(bindRateText);
	var rows = [], used = {};
	PPE_CFG_GROUPS.forEach(function(group) {
		var keys = group.keys.filter(function(k) { return parsed.map.hasOwnProperty(k); });
		if (!keys.length) return;
		rows.push(E('tr',{'class':'tr ppe-cfg-group'}, E('td',{'class':'td','colspan':3}, group.title)));
		keys.forEach(function(k) {
			used[k] = true;
			var meta = PPE_CFG_META[k] || {label:k};
			var val = parsed.map[k];
			rows.push(ppeCfgRow(meta.label, ppeHex(val), meta.desc ? meta.desc(val) : ''));
		});
		var b = group.ppe ? binds[group.ppe] : null;
		if (b) {
			var vals = [], cap = [];
			if (b.l2b !== undefined) { vals.push('l2b=' + b.l2b); cap.push('二层桥最多 ' + b.l2b + ' 条'); }
			if (b.l3 !== undefined) { vals.push('l3=' + b.l3); cap.push('三层路由最多 ' + b.l3 + ' 条'); }
			if (vals.length) rows.push(ppeCfgRow('绑定上限', vals.join(' / '), cap.join('，')));
		}
	});
	var rest = parsed.order.filter(function(k) { return !used[k]; });
	if (rest.length) {
		rows.push(E('tr',{'class':'tr ppe-cfg-group'}, E('td',{'class':'td','colspan':3}, '其他')));
		rest.forEach(function(k) { rows.push(ppeCfgRow(k, ppeHex(parsed.map[k]), '驱动新增字段，原样显示')); });
	}
	return rows;
}

/* ── PPE Table ── */
function renderPpeRows(entries) {
	var sorted = entries.slice().sort(function(a, b) {
		var ab = a.state === 'BND' ? 0 : 1;
		var bb = b.state === 'BND' ? 0 : 1;
		return ab - bb;
	});
	return sorted.slice(0,100).map(function(e) {
		var eth = e.eth||''; if(eth==='00:00:00:00:00:00->00:00:00:00:00:00') eth='-';
		return E('tr',{'class':'tr'},[
			E('td',{'class':'td'},e.index), E('td',{'class':'td'},E('span',{'class':e.state==='BND'?'label-success':''},e.state)),
			E('td',{'class':'td'},e.type), E('td',{'class':'td'},e.orig||'-'), E('td',{'class':'td'},e.new_flow||'-'), E('td',{'class':'td'},eth)
		]);
	});
}

/* ── Main View ── */
return view.extend({
	load: function() {
		return Promise.all([ callNpuStatus(), callPpeEntries(), callFrameEngine() ]);
	},
	render: function(data) {
		_prevFe = null; // 进入页面重置基准，首帧显示“采样中”，避免沿用上次访问的陈旧计数
		injectCSS();
		var st = data[0]||{}, ppe = data[1]||{}, fe = data[2]||{};
		_ppeCfgKey = (st.ppe_config||'') + '|' + (st.ppe_bind_rate||'');
		var entries = Array.isArray(ppe.entries) ? ppe.entries : [];
		var memR = Array.isArray(st.memory_regions) ? st.memory_regions : [];
		var freqSource = st.cpu_freq_source || 'cpufreq';
		var cpuTemp = st.cpu_temp || 0;
		var tempDisplay = cpuTemp > 0 ? (cpuTemp + ' °C') : 'N/A';

		var view = E('div',{'class':'cbi-map'},[
			E('h2',{'style':'margin-top:8px;margin-bottom:14px'},_('Airoha SoC 状态')),
			// CPU Frequency
			E('div',{'class':'cbi-section soc-section'},[
				E('h3',{},_('CPU 频率')),
				E('table',{'class':'table','id':'cpu-freq-table'},[
					E('tr',{'class':'tr'},[ E('td',{'class':'td'},E('strong',{},_('当前频率'))), E('td',{'class':'td'}, renderFreqBar(st.cpu_hw_freq,st.cpu_min_freq,st.cpu_max_freq,st.pll_freq_mhz,st.cpu_governor,freqSource)) ]),
					E('tr',{'class':'tr'},[ E('td',{'class':'td'},E('strong',{},_('CPU 温度'))), E('td',{'class':'td','id':'cpu-temp'}, tempDisplay) ]),
					E('tr',{'class':'tr'},[ E('td',{'class':'td'},E('strong',{},_('调频策略'))), E('td',{'class':'td'}, renderGovSelect(st.cpu_avail_governors,st.cpu_governor)) ]),
					E('tr',{'class':'tr'},[ E('td',{'class':'td'},E('strong',{},_('最高频率'))), E('td',{'class':'td'}, renderMaxFreqSelect(st.cpu_avail_freqs,st.cpu_max_freq)) ]),
					E('tr',{'class':'tr'},[ E('td',{'class':'td'},E('strong',{},_('超频'))), E('td',{'class':'td'}, renderOcControls()) ]),
					E('tr',{'class':'tr'},[ E('td',{'class':'td'},E('strong',{},_('CPU 核心数'))), E('td',{'class':'td'},(st.cpu_count||0).toString()) ])
				])
			]),
			// NPU
			E('div',{'class':'cbi-section soc-section'},[
				E('h3',{},_('NPU')),
				E('table',{'class':'table','id':'npu-table'},[
					E('tr',{'class':'tr'},[ E('td',{'class':'td'},E('strong',{},_('NPU 状态'))),
						E('td',{'class':'td','id':'npu-status'}, st.npu_loaded ?
							E('span',{'class':'label-success'},_('已激活')) :
							E('span',{'class':'label-danger'},_('未激活'))) ]),
					E('tr',{'class':'tr'},[ E('td',{'class':'td'},E('strong',{},_('SoC 平台'))),
						E('td',{'class':'td','id':'npu-compatible'}, st.npu_compatible || 'N/A') ]),
					E('tr',{'class':'tr'},[ E('td',{'class':'td'},E('strong',{},_('固件版本'))),
						E('td',{'class':'td','id':'npu-fw-ver'}, st.npu_version && st.npu_version !== 'Unknown' ? st.npu_version : (st.npu_fw_ver || 'N/A')) ]),
					E('tr',{'class':'tr'},[ E('td',{'class':'td'},E('strong',{},_('时钟 / 核心数'))),
						E('td',{'class':'td','id':'npu-clk-cores'}, (st.npu_clock?(st.npu_clock/1e6).toFixed(0)+' MHz':'N/A')+' | '+(st.npu_cores||0)+' ' + _('核心')) ]),
					E('tr',{'class':'tr'},[ E('td',{'class':'td'},E('strong',{},_('保留内存'))),
						E('td',{'class':'td','id':'npu-memory'}, calcTotalMem(memR)) ]),
					E('tr',{'class':'tr'},[ E('td',{'class':'td'},E('strong',{},_('说明'))),
						E('td',{'class':'td'}, '8x RISC-V 通过 PCIe 连接 RAM — PPE 初始化、流/PON 卸载、数据包处理') ])
				])
			]),
			// Hardware Offload Engine
			E('div',{'class':'cbi-section soc-section'},[
				E('h3',{},_('硬件卸载引擎')),
				E('div',{'id':'fe-container'}, renderFeDiagram(fe, st))
			]),
			// PPE Flow Table - with responsive scroll wrapper
			E('div',{'class':'cbi-section soc-section'},[
				E('h3',{},_('PPE 硬件流表')),
				E('div',{'class':'soc-table-wrap'},[
					E('table',{'class':'table','id':'ppe-entries-table'},[
						E('tr',{'class':'tr cbi-section-table-titles'},[
							E('th',{'class':'th'},_('索引')), E('th',{'class':'th'},_('状态')), E('th',{'class':'th'},_('类型')),
							E('th',{'class':'th'},_('原始转发流')), E('th',{'class':'th'},_('NAT 后转发流')), E('th',{'class':'th'},_('MAC 地址'))
						])
					].concat(renderPpeRows(entries)))
				])
			]),
			// PPE Config (collapsible, below flow table)
			st.ppe_config ? E('div',{'class':'cbi-section soc-section'},[
				E('details',{'id':'ppe-config-details','style':'border:1px solid var(--soc-border);border-radius:8px;padding:10px 12px;background:var(--soc-card-bg)'},[
					E('summary',{'style':'cursor:pointer;font-size:15px;font-weight:600;color:var(--soc-text);list-style:none;display:flex;align-items:center'}, [
						E('span',{'id':'ppe-config-arrow','style':'margin-right:8px;font-size:12px;transition:transform .2s'},'▶'),
						_('PPE 配置寄存器')
					]),
					E('div',{'style':'font-size:13px;color:var(--soc-muted);margin:8px 0 10px 20px'},_('PPE 硬件转发引擎的底层寄存器配置，用于调试和诊断。')),
					E('div',{'class':'soc-table-wrap'},[
						E('table',{'class':'table','id':'ppe-config-table'},[
							E('tr',{'class':'tr cbi-section-table-titles'},[
								E('th',{'class':'th'},_('项目')), E('th',{'class':'th'},_('值')), E('th',{'class':'th'},_('说明'))
							])
						].concat(renderPpeConfigRows(st.ppe_config, st.ppe_bind_rate)))
					])
				])
			]) : null
		]);

		poll.add(L.bind(function() {
			return Promise.all([ callNpuStatus(), callPpeEntries(), callFrameEngine() ]).then(L.bind(function(d) {
				injectCSS();
				var st=d[0]||{}, ppe=d[1]||{}, fe=d[2]||{};
				var entries = Array.isArray(ppe.entries)?ppe.entries:[];
				var freqSrc = st.cpu_freq_source || 'cpufreq';

				updateFreqBar(st.cpu_hw_freq,st.cpu_min_freq,st.cpu_max_freq,st.pll_freq_mhz,st.cpu_governor,freqSrc);

				// Update CPU temperature
				var tempEl = document.getElementById('cpu-temp');
				if (tempEl) {
					var t = st.cpu_temp || 0;
					tempEl.textContent = t > 0 ? (t + ' °C') : 'N/A';
				}

				var gs=document.getElementById('cpu-governor-select'); if(gs&&!gs.matches(':focus')) gs.value=st.cpu_governor||'';
				var fs=document.getElementById('cpu-maxfreq-select'); if(fs&&!fs.matches(':focus')) fs.value=(st.cpu_max_freq||0).toString();

				var se=document.getElementById('npu-status');
				if(se){se.innerHTML='';var sp=document.createElement('span');sp.className=st.npu_loaded?'label-success':'label-danger';sp.textContent=st.npu_loaded?_('已激活'):_('未激活');se.appendChild(sp);}

				var fc=document.getElementById('fe-container'); if(fc){fc.innerHTML='';fc.appendChild(renderFeDiagram(fe, st));}

				var tb=document.getElementById('ppe-entries-table');
				if(tb){while(tb.rows.length>1)tb.deleteRow(1);renderPpeRows(entries).forEach(function(r){tb.appendChild(r);});}

				// PPE 配置：驱动输出变化时才重建（配置表默认折叠，重建开销可忽略）
				var cfgKey=(st.ppe_config||'')+'|'+(st.ppe_bind_rate||'');
				if(cfgKey!==_ppeCfgKey){
					_ppeCfgKey=cfgKey;
					var ct=document.getElementById('ppe-config-table');
					if(ct){while(ct.rows.length>1)ct.deleteRow(1);renderPpeConfigRows(st.ppe_config,st.ppe_bind_rate).forEach(function(r){ct.appendChild(r);});}
				}
			},this));
		},this), 5);

		return view;
	},
	handleSaveApply: null, handleSave: null, handleReset: null
});
