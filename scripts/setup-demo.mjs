#!/usr/bin/env node
// Explicit local-only demo provisioning; never modifies the application's main database.
import { DatabaseSync } from 'node:sqlite';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { PLATFORM_SCHEMA, hashPassword } from '../src/lib/platform-core.mjs';
if (process.env.NODE_ENV === 'production') throw new Error('Demo setup is local only.');
const filename = path.resolve('data/demo.sqlite');
const credentialsFile = path.resolve('data/demo-credentials.json');
if (existsSync(filename)) throw new Error('Demo database already exists. Existing credentials are in data/demo-credentials.json; no data was changed.');
mkdirSync(path.dirname(filename), { recursive: true });
process.env.LTB_DATABASE_PATH = filename;
const temp = mkdtempSync(path.join(tmpdir(), 'ltb-demo-'));
try {
  for (const name of ['features', 'public-demo', 'platform']) {
    const source = readFileSync(`src/lib/${name}.ts`, 'utf8');
    writeFileSync(path.join(temp, `${name}.mjs`), ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText.replaceAll('"./features"', '"./features.mjs"').replaceAll('"./public-demo"', '"./public-demo.mjs"'));
  }
  copyFileSync('src/lib/platform-core.mjs', path.join(temp, 'platform-core.mjs'));
  const p = await import(pathToFileURL(path.join(temp, 'platform.mjs')));
  const { FEATURE_PRESETS } = await import(pathToFileURL(path.join(temp, 'features.mjs')));
  const password = `Demo-${randomBytes(9).toString('base64url')}!`;
  const db = new DatabaseSync(filename); db.exec(PLATFORM_SCHEMA);
  const admin = randomUUID(); const now = new Date().toISOString();
  db.prepare('INSERT INTO users VALUES (?,NULL,?,?,?,?,?,?)').run(admin, 'LTB Demo Administrator', 'admin@ltb.demo', 'platform_admin', 'active', await hashPassword(password), now);
  db.close();
  const full = p.createFirm({name:'Kovač & partneri · DEMO', status:'active', features:FEATURE_PRESETS.complete, greeting:'Demonstracijski ured · svi podaci su izmišljeni.'}, admin);
  const limited = p.createFirm({name:'Novak pravni ured · DEMO', status:'active', features:FEATURE_PRESETS.core, accent:'#16746E', greeting:'Demonstracijski ured s osnovnim funkcijama.'}, admin);
  const accounts = [];
  for (const [firm, email, name] of [[full,'ured@ltb.demo','Ana Kovač'],[limited,'osnovni@ltb.demo','Ivan Novak']]) {
    const invitation = p.inviteUser({firmId:firm.id, email, name, role:'firm_admin'}, admin);
    const user = await p.acceptInvitation(invitation.token, password);
    const clientId = randomUUID(); const matterId = randomUUID(); const documentId = randomUUID();
    const deadline = new Date(Date.now()+14*86400000).toISOString().slice(0,10);
    const content = `DEMO — izmišljeni ugovor za pregled sučelja. Članak 1. Studio Jadran i Primjer usluge ugovaraju savjetodavne usluge. Članak 2. Naknada iznosi 2.400 EUR. Rok plaćanja je ${deadline}. Članak 3. Otkazni rok iznosi 30 dana. Članak 4. Opseg usluga utvrđuje se pisanim dogovorom stranaka.`;
    const result = {vrsta:'Ugovor o poslovnoj suradnji', sazetak:'DEMO: izmišljeni primjer ugovora o savjetodavnim uslugama, s naknadom od 2.400 EUR i otkaznim rokom od 30 dana.', strane:[{naziv:'Studio Jadran (demo)',uloga:'Naručitelj'},{naziv:'Primjer usluge (demo)',uloga:'Izvršitelj'}], odredbePoClancima:[{naslov:'Članak 2. Naknada',sazetak:'Ugovorena naknada iznosi 2.400 EUR.',izvor:{clanak:'Članak 2.',citat:'Naknada iznosi 2.400 EUR.'}}], kljucniUvjeti:[{naziv:'Otkazni rok',vrijednost:'30 dana'}], iznosi:[{opis:'Naknada za usluge',iznos:'2.400',valuta:'EUR'}], datumiIRokovi:[{opis:'Rok plaćanja — demo',datum:deadline,vrsta:'plaćanje'}], obveze:[{strana:'Naručitelj',opis:'Podmiriti ugovorenu naknadu.',rok:deadline}],prava:[],reference:[],napomene:[{opis:'Sintetički sadržaj za pregled aplikacije; nije rezultat stvarne AI obrade.'}]};
    p.writeFirmData(firm.id,{firm:{id:firm.id,name:firm.name},user:{id:user.id,name,role:user.role},clients:[{id:clientId,name:'Studio Jadran · DEMO',sector:'Savjetovanje',contact:'kontakt@example.test'}],matters:[{id:matterId,clientId,title:'Poslovna suradnja · DEMO',type:'Ugovorno pravo'}],documents:[{id:documentId,title:'Ugovor o poslovnoj suradnji · DEMO',filename:'demo-ugovor.txt',files:['demo-ugovor.txt'],type:result.vrsta,clientId,matterId,createdAt:now,analyses:['sazetak','detaljna'].map(mode=>({mode,status:'analizirano',jobId:randomUUID(),createdAt:now,result})),conversation:[]}],chunks:[{id:randomUUID(),documentId,index:0,heading:'Demonstracijski ugovor',text:content}],audit:[{id:randomUUID(),ts:now,actor:name,action:'Dodan je demonstracijski dokument',target:'Ugovor o poslovnoj suradnji · DEMO',feature:'documents'}],settings:{sources:{'vasi-dokumenti':true}},regUpdates:[{id:randomUUID(),date:now.slice(0,10),source:'Izmišljeni demo izvor',sourceId:'rh-zakoni',title:'Primjer regulatorne obavijesti · DEMO',summary:'Izmišljena obavijest služi isključivo za pregled sučelja. Ne predstavlja stvarnu promjenu propisa.',areas:['Ugovorno pravo'],severity:'srednja',affectedClientIds:[clientId],action:'Pregledati demonstracijski primjer.',reviewed:false}]},0);
    accounts.push({email,firm:firm.name});
  }
  const credentials = {url:'http://localhost:3010/prijava',password,accounts:[{email:'admin@ltb.demo',firm:'LTB administration'},...accounts]};
  writeFileSync(credentialsFile,JSON.stringify(credentials,null,2),{mode:0o600});
  console.log(JSON.stringify(credentials,null,2));
} finally { rmSync(temp,{recursive:true,force:true}); }
