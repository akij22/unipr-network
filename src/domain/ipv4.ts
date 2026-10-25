import { fail, issue, ok, type Result } from './types';
export type PrefixInfo = {network:string;broadcast:string|null;totalAddresses:number;usableHosts:number;networkBits:string;hostBits:string;subnetCount:number|null};
export function parseIPv4(value:string):Result<number> {
 const parts=value.split('.');
 if(parts.length!==4 || parts.some(p=>! /^(0|[1-9][0-9]{0,2})$/.test(p)||Number(p)>255)) return fail(issue('INVALID_IPV4',[],{value},'input'));
 return ok(parts.reduce((n,p)=>n*256+Number(p),0));
}
export function formatIPv4(n:number):string { return [24,16,8,0].map(shift=>(n>>>shift)&255).join('.'); }
export function contains(network:IPv4Network, ip:string):boolean {
 const a=parseIPv4(network.ip), b=parseIPv4(ip);
 return a.ok&&b.ok&&Math.floor(a.value/2**(32-network.prefix))===Math.floor(b.value/2**(32-network.prefix));
}
type IPv4Network={ip:string;prefix:number};
export function analyzePrefix(ip:string,prefix:number,options:{parentPrefix?:number;pointToPoint?:boolean}={}):Result<PrefixInfo>{
 const parsed=parseIPv4(ip);
 if(!parsed.ok) return parsed;
 if(!Number.isInteger(prefix)||prefix<0||prefix>32||options.parentPrefix!==undefined&&(!Number.isInteger(options.parentPrefix)||options.parentPrefix<0||options.parentPrefix>prefix)) return fail(issue('INVALID_PREFIX',[],{},'input'));
 const totalAddresses=2**(32-prefix), base=Math.floor(parsed.value/totalAddresses)*totalAddresses;
 const bits=parsed.value.toString(2).padStart(32,'0');
 const special=prefix===32||prefix===31&&options.pointToPoint;
 return ok({network:formatIPv4(base),broadcast:special?null:formatIPv4(base+totalAddresses-1),totalAddresses,usableHosts:special?totalAddresses:Math.max(0,totalAddresses-2),networkBits:bits.slice(0,prefix),hostBits:bits.slice(prefix),subnetCount:options.parentPrefix===undefined?null:2**(prefix-options.parentPrefix)});
}
