import { readJsonObject } from "@/lib/auth";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-access";
import { AccessError } from "@/lib/auth";
import { readDB, writeDB, addAudit } from "@/lib/db";
export const POST=apiRoute("clients",async (req)=>{
 const body=await readJsonObject(req);
 if(!body || typeof body!=="object")throw new AccessError(400,"Provjerite podatke o klijentu.");
 const text=(key:string,max=200)=>typeof body[key]==="string"?body[key].trim().slice(0,max):"";
 const name=text("name"), sector=text("sector"), oib=text("oib",20),contact=text("contact");
 if(!name)throw new AccessError(400,"Unesite naziv klijenta.");
 if(oib&&!/^\d{11}$/.test(oib))throw new AccessError(400,"OIB mora sadržavati 11 znamenki.");
 const db=await readDB();const client={id:randomUUID(),name,sector:sector||"—",oib,contact};
 db.clients.push(client);addAudit(db,"Dodao klijenta",name,"clients");await writeDB(db, "clients");return NextResponse.json({id:client.id},{status:201});
});
