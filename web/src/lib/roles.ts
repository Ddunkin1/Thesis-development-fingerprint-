// The first page each kind of account sees. (Safe to import anywhere, including proxy.ts.)
export const homeOf = (role: string) => (role === "member" ? "/member" : "/admin");
