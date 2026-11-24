// Fixed prices. The monthly membership is a flat fee: the server always charges this amount, so the
// browser can never send a different one. Change it with the MEMBERSHIP_PRICE environment variable.
export const MEMBERSHIP_PRICE = Number(process.env.MEMBERSHIP_PRICE ?? 800);
