export class Lock {
  private _locked = false;

  constructor(readonly timeout?: number) {}

  public aquire(): boolean {
    if (this._locked) {
      return false;
    }
    this._locked = true;
    return true;
  }

  public release(): boolean {
    if (!this._locked) {
      return false;
    }
    this._locked = false;
    return true;
  }

  public acquireAsync(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (this.timeout && Date.now() - start > this.timeout)
          reject(new Error('Lock timeout'));
        if (this.aquire()) {
          resolve();
        } else {
          setTimeout(check, 0);
        }
      };
      check();
    });
  }
}
