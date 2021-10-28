enum TryCatchStatus {
  Pending = 'pending',
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

type Fn<R = any> = (e?: any) => R;

export class TryCatch<R = any> {
  private status: TryCatchStatus = TryCatchStatus.Pending;

  private _result: any;

  private error?: any;

  private catchStack: Fn[] = [];

  constructor(fn: Fn) {
    this.catch(fn);
  }

  public do(): R {
    this.runner();

    if (this.status === TryCatchStatus.Rejected) {
      throw new Error(this.error);
    }

    return this._result;
  }

  public catch<R1 = R>(fn: Fn<R1>): TryCatch<R> {
    this.catchStack.push(fn);

    return this;
  }

  private runner(e?: any) {
    const fn = this.catchStack.shift();

    /** 当不存在后续调用链 或 状态为 Fulfilled 时返回 */
    if (!fn || this.status === TryCatchStatus.Fulfilled) {
      return;
    }

    try {
      this._result = fn(e);
      this.status = TryCatchStatus.Fulfilled;
    } catch (error: any) {
      this.error = error;
      this.status = TryCatchStatus.Rejected;
      this.runner(error);
    }
  }
}
