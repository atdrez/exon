// SPDX-License-Identifier: MIT

let currentMessage: any = null;

export function setMessage(msg: any): void {
    currentMessage = msg;
}

export function getMessage(): any {
    return currentMessage;
}
