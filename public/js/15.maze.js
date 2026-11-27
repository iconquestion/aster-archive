window.mazeGame = function () {
  let stageToken = '';

  return {
    ws: null,
    connecting: false,
    connected: false,
    initialized: false,
    pendingAction: '',
    lastMoveAt: 0,
    win: false,
    complete: false,
    nextLevelFlag: '',
    moveStatus: '',
    stage: 0,
    stageCount: 0,
    size: { x: 0, y: 0 },
    player: null,
    view: [],
    fullMaze: null,
    logs: [],
    logId: 0,

    get pending() {
      return this.pendingAction !== '';
    },

    get canAdvance() {
      return this.win && !this.complete && Boolean(stageToken);
    },

    get terminalStatus() {
      if (this.connecting) return '正在连接终端…';
      return this.connected ? '终端已连接' : '连接已中断';
    },

    addLog(direction, event, payload) {
      const box = this.$refs.logBox;
      const follow =
        box && box.scrollHeight - box.clientHeight - box.scrollTop < 8;
      const time = new Date();
      const visiblePayload =
        payload &&
        Object.hasOwn(payload, 'flag') &&
        (direction !== '接收' || payload.complete !== true)
          ? { ...payload, flag: '[已隐藏]' }
          : payload;

      if (this.logs.length >= 150) this.logs.shift();
      this.logs.push({
        id: ++this.logId,
        datetime: time.toISOString(),
        time: time.toLocaleTimeString('zh-CN', { hour12: false }),
        direction,
        event,
        json: JSON.stringify(visiblePayload, null, 2),
      });
      if (follow) this.$nextTick(() => this.scrollLogToBottom());
    },

    scrollLogToBottom() {
      const box = this.$refs.logBox;
      if (box) box.scrollTop = box.scrollHeight;
    },

    sendRequest(request) {
      this.pendingAction = request.action;
      this.addLog('发送', request.action, request);
      this.ws.send(JSON.stringify(request));
    },

    connect() {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${location.host}/api/15/challenge`;
      this.addLog('系统', 'connect', { url });
      const socket = new WebSocket(url);
      this.ws = socket;
      this.connecting = true;

      socket.onopen = () => {
        if (this.ws !== socket) return;
        this.connecting = false;
        this.connected = true;
        this.addLog('系统', 'open', { protocol: 'WebSocket' });
        this.sendRequest({ action: 'init' });
      };
      socket.onmessage = ({ data }) => {
        if (this.ws !== socket) return;
        try {
          this.handleMessage(JSON.parse(data));
        } catch {
          this.pendingAction = '';
          this.addLog('接收', 'error', { error: 'Invalid WebSocket response' });
        }
      };
      socket.onclose = ({ code, reason }) => {
        if (this.ws !== socket) return;
        this.connecting = false;
        this.connected = false;
        this.pendingAction = '';
        this.addLog('系统', 'close', { code, reason });
      };
      socket.onerror = () => {
        if (this.ws !== socket) return;
        this.connecting = false;
        this.pendingAction = '';
        this.addLog('系统', 'error', { error: 'WebSocket connection error' });
      };
    },

    handleMessage(data) {
      const event = data?.message ? 'welcome' : this.pendingAction || 'message';
      this.addLog('接收', event, data);

      if (data?.current_location && Array.isArray(data.view)) {
        this.player = data.current_location;
        this.view = data.view;
        this.pendingAction = '';

        if (typeof data.x === 'number' && typeof data.y === 'number') {
          this.size = { x: data.x, y: data.y };
          this.stage = data.stage;
          this.stageCount = data.stage_count;
          this.initialized = true;
          this.win = false;
          this.complete = false;
          stageToken = '';
          this.nextLevelFlag = '';
          this.moveStatus = '';
          this.fullMaze = null;
          this.lastMoveAt = 0;
        }

        if (data.win) {
          this.win = true;
          this.complete = data.complete;
          stageToken = this.complete ? '' : data.flag || '';
          this.nextLevelFlag = this.complete ? data.flag || '' : '';
          this.fullMaze = data.maze;
          this.moveStatus = this.complete
            ? '三张迷宫全部完成！'
            : '找到本张迷宫的出口！';
        } else if (typeof data.success === 'boolean') {
          this.moveStatus = data.success ? '前进成功' : '撞墙';
        }
      } else if (data?.error) {
        this.pendingAction = '';
      }
    },

    move(direction, event) {
      if (!this.initialized || this.win) return;
      if (this.ws?.readyState !== WebSocket.OPEN) return;
      event?.preventDefault();
      if (this.pending) return;

      const now = Date.now();
      if (now - this.lastMoveAt < 120) return;
      this.lastMoveAt = now;
      this.sendRequest({ action: 'move', direction });
    },

    next() {
      if (!this.canAdvance || this.pending) return;
      if (this.ws?.readyState !== WebSocket.OPEN) return;

      this.sendRequest({ action: 'next', flag: stageToken });
    },

    reconnect() {
      this.ws?.close();
      this.connected = false;
      this.initialized = false;
      this.pendingAction = '';
      this.lastMoveAt = 0;
      this.win = false;
      this.complete = false;
      stageToken = '';
      this.nextLevelFlag = '';
      this.moveStatus = '';
      this.stage = 0;
      this.player = null;
      this.fullMaze = null;
      this.view = [];
      this.logs = [];
      this.connect();
    },

    cellAt(x, y) {
      if (!this.player) return undefined;
      if (this.fullMaze) return this.fullMaze[y][x];
      return this.view[y - this.player.y + 1]?.[x - this.player.x + 1];
    },

    cellClass(cell) {
      return (
        { 1: 'cell-wall', S: 'cell-start', E: 'cell-end', 0: 'cell-path' }[
          cell
        ] ?? 'cell-fog'
      );
    },
  };
};
