import type { ExtractionResult } from "@/lib/types";
const fields: Record<string,string[]> = {
 strane:["naziv","uloga","oib","adresa"], odredbePoClancima:["naslov","sazetak"], kljucniUvjeti:["naziv","vrijednost"], iznosi:["opis","iznos","valuta"], datumiIRokovi:["opis","datum","vrsta"], obveze:["strana","opis","rok"], prava:["strana","opis"], reference:["propis"], napomene:["opis"],
};
function record(value:unknown): value is Record<string,unknown>{return !!value&&typeof value==="object"&&!Array.isArray(value);}
function validStrings(value:unknown,keys:string[]){return record(value)&&keys.every(key=>value[key]===undefined||typeof value[key]==="string")&&(value.izvor===undefined||(record(value.izvor)&&["clanak","citat"].every(key=>value.izvor && (typeof (value.izvor as Record<string,unknown>)[key]==="string" || (value.izvor as Record<string,unknown>)[key]===undefined))));}
export function validExtraction(value:unknown): value is ExtractionResult {
 if(!record(value)||typeof value.vrsta!=="string"||typeof value.sazetak!=="string")return false;
 for(const [key,keys] of Object.entries(fields)){
  const items=value[key]; if(!Array.isArray(items)||items.length>2000||!items.every(item=>validStrings(item,keys)))return false;
 }
 return [["mjerodavnoPravo",["pravo"]],["nadleznost",["opis"]],["prestanak",["opis","otkazniRok"]]].every(([key,keys])=>value[key as string]===undefined||validStrings(value[key as string],keys as string[]));
}
