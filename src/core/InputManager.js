export class InputManager {
  constructor() {
    this.keys = {};
    this.keysJustPressed = {};
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, buttons: 0 };
    this._prevMouse = { x: 0, y: 0 };
    this._listeners = [];

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);

    window.addEventListener('contextmenu', e => e.preventDefault());
  }

  _onKeyDown(e) {
    const key = e.key.toLowerCase();
    if (!this.keys[key]) {
      this.keysJustPressed[key] = true;
    }
    this.keys[key] = true;
  }

  _onKeyUp(e) {
    this.keys[e.key.toLowerCase()] = false;
  }

  _onMouseMove(e) {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
    this.mouse.dx = e.movementX || 0;
    this.mouse.dy = e.movementY || 0;
  }

  _onMouseDown(e) {
    this.mouse.buttons = e.buttons;
  }

  _onMouseUp(e) {
    this.mouse.buttons = e.buttons;
  }

  isDown(key) {
    return !!this.keys[key.toLowerCase()];
  }

  justPressed(key) {
    return !!this.keysJustPressed[key.toLowerCase()];
  }

  isLeft() { return this.isDown('a') || this.isDown('arrowleft'); }
  isRight() { return this.isDown('d') || this.isDown('arrowright'); }
  isUp() { return this.isDown('w') || this.isDown('arrowup'); }
  isDown2() { return this.isDown('s') || this.isDown('arrowdown'); }
  isAction() { return this.isDown(' ') || this.isDown('enter'); }
  isAction2() { return this.isDown('shift'); }

  clearFrame() {
    this.keysJustPressed = {};
    this.mouse.dx = 0;
    this.mouse.dy = 0;
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
  }
}
