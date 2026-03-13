export function fnCapitalize(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function a(s: TemplateStringsArray): string[] {
    return s[0].split(' ')
}

export function fnRandomString(): string {
    return (Math.random() + 1).toString(36).substring(7);
}

export function fnSaveFile(sFileName: string, sData: string): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(sData);
    const oE = document.createElement("A") as HTMLAnchorElement;
    oE.setAttribute("href", dataStr);
    oE.setAttribute("download", `${sFileName}_${(new Date).getTime()}.json`);
    oE.click();
    oE.remove()
}

/**
 * Debounce function — delays execution until after wait ms of inactivity
 */
export function fnDebounce<T extends (...args: any[]) => void>(fn: T, iDelay: number = 300): (...args: Parameters<T>) => void {
    let iTimer: ReturnType<typeof setTimeout> | null = null
    return function (this: any, ...args: Parameters<T>) {
        if (iTimer) clearTimeout(iTimer)
        iTimer = setTimeout(() => fn.apply(this, args), iDelay)
    }
}