import {toPredicate} from "@a-laughlin/fp-utils"

export const filter=mapSelection=>x=>{const p=toPredicate(x);return(acc,arr,id)=>p(arr[3],id)?mapSelection(acc,arr,id):acc};
export const omit=mapSelection=>x=>{const p=toPredicate(x);return(acc,arr,id)=>!p(arr[3],id)?mapSelection(acc,arr,id):acc};