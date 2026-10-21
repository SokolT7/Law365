import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID,randomBytes} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createServer} from 'node:net';
import {createServer as createHttpServer} from 'node:http';
import {PLATFORM_SCHEMA,hashPassword} from '../src/lib/platform-core.mjs';

// Run only against an isolated local server and disposable SQLite database.
if(!existsSync('.next/BUILD_ID'))throw new Error('Run npm run build before integration tests.');
const directory=mkdtempSync(path.join(tmpdir(),'ltb-http-test-'));
const database=path.join(directory,'platform.sqlite');
const socket=createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));
const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
const base=`http://localhost:${port}`;
const sqlite=new DatabaseSync(database);sqlite.exec(PLATFORM_SCHEMA);
const features=['documents','document_chat','summary_analysis','detailed_analysis','contract_review','clients','legal_questions','regulatory_tracking','source_settings','activity_log'];
const firms=[randomUUID(),randomUUID()];const now=new Date().toISOString();
for(const [i,id] of firms.entries())sqlite.prepare('INSERT INTO firms VALUES (?,?,?,?,?,?,?,?,?)').run(id,`Test ured ${i+1}`,`Test ured ${i+1}`,'#3D5FE5','Sintetički testni sadržaj','active',JSON.stringify(i===0?features:['documents','summary_analysis','activity_log']),now,now);
const config={users:[]};
for(const [email,role,firm] of [['admin@preview.test','platform_admin',null],['ana@preview.test','firm_admin',firms[0]],['ivan@preview.test','member',firms[1]]]){
 const password=randomBytes(24).toString('base64url');config.users.push({email,password});
 sqlite.prepare('INSERT INTO users VALUES (?,?,?,?,?,?,?,?)').run(randomUUID(),firm,email,email,role,'active',await hashPassword(password),now);
}
sqlite.close();
const callbackSecret=randomBytes(32).toString('hex');
const dispatched=[];
const webhook=createHttpServer(async(req,res)=>{
 let body='';for await(const chunk of req)body+=chunk;
 if(req.headers['x-ltblaw-secret']!==callbackSecret){res.writeHead(401);res.end();return;}
 dispatched.push(JSON.parse(body));res.writeHead(200,{'Content-Type':'application/json'});res.end('{"ok":true}');
});
await new Promise(resolve=>webhook.listen(0,'127.0.0.1',resolve));
const webhookUrl=`http://127.0.0.1:${webhook.address().port}`;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port',String(port),'--hostname','127.0.0.1'],{
 env:{...process.env,NODE_ENV:'production',LTB_DATABASE_PATH:database,LTB_APP_URL:base,APP_BASE_URL:base,ANTHROPIC_API_KEY:'',N8N_DOC_WEBHOOK_URL:webhookUrl,N8N_WEBHOOK_SAZETAK:webhookUrl,N8N_WEBHOOK_DETALJNA:webhookUrl,N8N_SHARED_SECRET:callbackSecret},
 stdio:['ignore','pipe','pipe']
});
let startup='';server.stdout.on('data',chunk=>{startup+=chunk;});server.stderr.on('data',()=>{});
let checks=0;
try {
 const deadline=Date.now()+20000;let ready=false;
 while(Date.now()<deadline){try{const r=await fetch(base+'/prijava');if(r.ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
 if(!ready)throw new Error('Isolated test server did not start.');
function check(value,message){assert.ok(value,message);checks++;console.log('PASS '+message);}
async function request(path,{cookie,method='GET',body,origin=base,form}={}){
 const headers={};if(cookie)headers.Cookie=cookie;if(method!=='GET'){headers.Origin=origin;if(!form)headers['Content-Type']='application/json';}
 const res=await fetch(base+path,{method,headers,redirect:'manual',body:form|| (body===undefined?undefined:JSON.stringify(body))});
 const text=await res.text();let data;try{data=JSON.parse(text);}catch{}return {res,data,text};
}
async function login(email){const user=config.users.find(u=>u.email===email);const result=await request('/api/auth/login',{method:'POST',body:{email:user.email,password:user.password}});check(result.res.status===200,`login ${email}`);return result.res.headers.get('set-cookie').split(';')[0];}
check((await request('/')).res.status===307,'anonymous home redirects');
check((await request('/api/auth/demo',{method:'POST',body:{role:'admin'}})).res.status===404,'demo sign-in disabled outside demo mode');
check((await request('/api/documents/unknown')).res.status===401,'anonymous API denied');
check((await request('/api/sources',{method:'POST',origin:'https://invalid.test',body:{}})).res.status===403,'cross-origin writes denied');
const admin=await login('admin@preview.test');const ana=await login('ana@preview.test');const ivan=await login('ivan@preview.test');
check((await request('/api/admin/firms',{cookie:ana})).res.status===403,'firm admin cannot administer platform');
check((await request('/api/documents/unknown',{cookie:admin})).res.status===403,'platform admin cannot read firm documents');
check((await request('/api/ask',{cookie:ana,method:'POST',body:null})).res.status===400,'null request rejected cleanly');
check((await request('/api/sources',{cookie:ana,method:'POST',body:{id:'web',enabled:true}})).res.status===400,'unconnected source cannot be enabled');
check((await request('/api/chat',{cookie:ivan,method:'POST',body:{documentId:'unknown',message:'test'}})).res.status===403,'disabled chat blocked directly');
const client=await request('/api/clients',{cookie:ana,method:'POST',body:{name:'Sintetički klijent QA',sector:'Test'}});check(client.res.status===201,'client creation');
const fd=new FormData();fd.append('file',new Blob(['UGOVOR ZA TESTIRANJE. Članak 1. Ovaj dokument sadrži isključivo sintetičke podatke. Članak 2. Rok plaćanja je trideset dana od izdavanja računa.']), 'provjera-test.txt');fd.append('clientId',client.data.id);
const upload=await request('/api/documents',{cookie:ana,method:'POST',form:fd});check(upload.res.status===200,'upload associates own client');const id=upload.data.id;
const question=await request('/api/ask',{cookie:ana,method:'POST',body:{question:'Rok plaćanja'}});
check(question.res.status===200&&question.data.citations.length>0,'research returns references from permitted document');
const citation=question.data.citations[0];
const evidencePath=`/api/documents/${citation.documentId}/evidence?chunk=${citation.chunkId}`;
const evidence=await request(evidencePath,{cookie:ana});
check(evidence.res.status===200&&evidence.data.text.includes('Rok plaćanja'),'evidence opens the complete authorized passage');
check(evidence.res.headers.get('cache-control')==='private, no-store','evidence is never publicly cached');
check((await request(evidencePath,{cookie:ivan})).res.status===404,'cross-firm evidence access denied');
check((await request(evidencePath)).res.status===401,'anonymous evidence access denied');
check((await request(evidencePath,{cookie:admin})).res.status===403,'platform admin cannot inspect firm evidence');
check((await request(`/api/documents/wrong-document/evidence?chunk=${citation.chunkId}`,{cookie:ana})).res.status===404,'chunk cannot be attached to a different document');
const chat=await request('/api/chat',{cookie:ana,method:'POST',body:{documentId:id,message:'Rok plaćanja'}});
check(chat.res.status===200&&chat.data.citations[0]?.chunkId&&chat.data.citations[0]?.documentId===id,'document chat references retain exact source identifiers');
// Streaming research: SSE protocol, typed sources, verified citations, private persistence.
const sse=text=>text.split('\n\n').filter(f=>f.startsWith('data: ')).map(f=>JSON.parse(f.slice(6)));
const research=await request('/api/research/stream',{cookie:ana,method:'POST',body:{question:'Rok za izvanredni otkaz ugovora o radu'}});
const events=sse(research.text);
check(research.res.status===200&&research.res.headers.get('content-type')?.startsWith('text/event-stream'),'research streams server-sent events');
const complete=events.find(e=>e.type==='complete');
check(events.some(e=>e.type==='status')&&complete?.message.sources.some(s=>s.kind==='statute'&&s.label.startsWith('ZOR')),'research answer carries typed statute sources');
check([...complete.message.text.matchAll(/\[(\d+)\]/g)].every(m=>Number(m[1])>=1&&Number(m[1])<=complete.message.sources.length)&&complete.message.verification,'every answer citation resolves to a delivered source');
const threadId=events.find(e=>e.type==='thread')?.threadId;
const thread=await request(`/api/research/threads/${threadId}`,{cookie:ana});
check(thread.res.status===200&&thread.data.thread.messages.length===2&&thread.data.thread.messages[1].sources.length>0,'research thread persisted with source snapshot');
check((await request(`/api/research/threads/${threadId}`,{cookie:ivan})).res.status!==200,'research thread private to its author');
check((await request('/api/research/threads',{cookie:ana})).data.threads.some(t=>t.id===threadId),'research history lists own thread');
check((await request('/api/research/stream',{cookie:ana,method:'POST',body:{question:'test',threadId:'nepostojeci'}})).res.status===404,'unknown research thread rejected');
const unit=await request('/api/legal/units/zor%3A116',{cookie:ana});
check(unit.res.status===200&&/petnaest dana/.test(unit.data.text),'legal unit returns official article text');
check((await request('/api/legal/units/zor%3A116')).res.status===401,'anonymous legal unit access denied');
const docStream=sse((await request(`/api/documents/${id}/chat/stream`,{cookie:ana,method:'POST',body:{message:'Rok plaćanja'}})).text).find(e=>e.type==='complete');
check(docStream?.message.sources.some(s=>s.kind==='firm'&&s.documentId===id&&s.chunkId),'document chat stream cites the document passage');
const decision=await request('/api/review/decisions',{cookie:ana,method:'POST',body:{documentId:id,key:'usluge:raskid',status:'prihvaceno',comment:'Provjereno'}});
check(decision.res.status===200&&decision.data.decision.status==='prihvaceno','review decision recorded');
check((await request('/api/review/decisions',{cookie:ivan,method:'POST',body:{documentId:id,key:'usluge:raskid',status:'odbaceno'}})).res.status!==200,'other firm cannot decide on review');
const playbook=await request('/api/playbooks',{cookie:ana,method:'POST',body:{name:'Interni QA asistent',instructions:'Uvijek navedi rokove i odgovorne osobe u tablici.'}});
check(playbook.res.status===201&&(await request('/api/playbooks',{cookie:ana})).data.playbooks.some(p=>p.id===playbook.data.playbook.id),'firm admin creates firm playbook');
// Review templates: firm admins only; keywords are escaped and raw regex is never accepted from users.
const evil='(a+)+$';
const tpl=await request('/api/review/templates',{cookie:ana,method:'POST',body:{name:'QA predložak',detectKeywords:['ugovor za testiranje'],detect:[evil],topics:[{title:'Rok plaćanja',criteria:[{label:'Rok plaćanja',keywords:['rok plaćanja',evil],patterns:[evil]}]}]}});
check(tpl.res.status===201&&tpl.data.template.id.startsWith('ured-'),'firm admin creates review template');
check(tpl.data.template.detect.length===0&&!tpl.data.template.topics[0].criteria[0].patterns,'unvetted regex patterns are dropped');
check((await request('/api/review/templates',{cookie:ana,method:'POST',body:{name:'Bez tema',topics:[]}})).res.status===400,'template without topics rejected');
check((await request('/api/review/templates',{cookie:ivan,method:'POST',body:{name:'X',topics:[{title:'T',criteria:[{label:'L',keywords:['k']}]}]}})).res.status===403,'member cannot create review templates');
const started=Date.now();
const preview=await request('/api/review/preview',{cookie:ana,method:'POST',body:{documentId:id,template:{name:'ReDoS',topics:[{title:'T',criteria:[{label:'L',keywords:['a'.repeat(60)+'!']}]}]}}});
check(preview.res.status<500&&Date.now()-started<5000,'review preview stays fast on adversarial keywords');
check((await request('/api/review/templates',{cookie:ana})).data.templates.some(t=>t.id===tpl.data.template.id),'firm template listed with built-ins');
check((await request(`/api/review/templates?id=${tpl.data.template.id}`,{cookie:ana,method:'DELETE'})).res.status===200,'firm admin deletes review template');
// Client scope: only the firm's own clients; clearing works.
check((await request('/api/scope',{cookie:ana,method:'POST',body:{clientId:client.data.id}})).res.headers.get('set-cookie')?.includes(`ltb_klijent=${client.data.id}`),'client scope set for own client');
check((await request('/api/scope',{cookie:ivan,method:'POST',body:{clientId:client.data.id}})).res.status!==200,'client scope rejects another firm\'s client');
check(/ltb_klijent=;/.test((await request('/api/scope',{cookie:ana,method:'POST',body:{clientId:null}})).res.headers.get('set-cookie')??''),'client scope cleared');
check((await request(`/api/documents/${id}`,{cookie:ana})).res.status===200,'owner reads document status');
check((await request(`/api/documents/${id}`,{cookie:ivan})).res.status===404,'other firm cannot read document');
const otherFiles=new FormData();otherFiles.append('file',new Blob(['Ovo je drugi sintetički dokument s dovoljno teksta za provjeru privatnog pristupa datotekama.']), 'other.txt');
check((await request(`/api/documents/${id}/files`,{cookie:ivan,method:'POST',form:otherFiles})).res.status===404,'other firm cannot append files');
check((await request(`/api/documents/${id}`,{cookie:ana,method:'POST',body:{mode:'unknown'}})).res.status===400,'invalid analysis mode rejected');
const analysis=await request(`/api/documents/${id}`,{cookie:ana,method:'POST',body:{mode:'sazetak'}});
check(analysis.res.status===200&&analysis.data.status==='u_obradi','analysis dispatch saves pending state');
check(dispatched.length===1&&dispatched[0].documentId===id,'registered job dispatched to mock service');
const job=dispatched[0];
const extraction={vrsta:'Testni ugovor',sazetak:'Verified synthetic analysis result.',strane:[],odredbePoClancima:[],kljucniUvjeti:[],iznosi:[],datumiIRokovi:[],obveze:[],prava:[],reference:[],napomene:[]};
async function callback(body){const res=await fetch(base+'/api/n8n/callback',{method:'POST',headers:{'Content-Type':'application/json','x-ltblaw-secret':callbackSecret},body:JSON.stringify(body)});return res;}
check((await callback({v:1,jobId:job.jobId,documentId:'wrong-document',status:'ok',result:extraction})).status===404,'callback cannot change job document');
check((await callback({v:1,jobId:job.jobId,documentId:id,status:'ok',result:{}})).status===400,'callback rejects malformed extraction');
check((await callback({v:1,jobId:job.jobId,documentId:id,status:'ok',result:extraction})).status===200,'valid callback completes registered analysis');
check((await callback({v:1,jobId:job.jobId,documentId:id,status:'ok',result:{...extraction,sazetak:'MUST NOT OVERWRITE'}})).status===200,'duplicate callback is idempotent');
const resultPage=await request(`/dokumenti/${id}?analiza=sazetak`,{cookie:ana});
check(resultPage.text.includes('Verified synthetic analysis result.')&&!resultPage.text.includes('MUST NOT OVERWRITE'),'persisted result is displayed without duplicate overwrite');
// Exercise private register filters against real stored content, including page boundaries.
const fixtures = new DatabaseSync(database);
const payload = JSON.parse(fixtures.prepare('SELECT payload FROM firm_data WHERE firm_id=?').get(firms[0]).payload);
const sampleIds = Array.from({length:24},()=>randomUUID());
sampleIds.forEach((docId,index)=>payload.documents.push({id:docId,title:`Register fixture ${String(index).padStart(2,'0')}`,filename:`fixture-${index}.txt`,type:'Filter fixture',clientId:client.data.id,matterId:'',createdAt:now,analyses:[]}));
const regId=randomUUID();
payload.regUpdates=[{id:regId,date:now.slice(0,10),source:'Synthetic test source',sourceId:'rh-zakoni',title:'Synthetic regulation filter',summary:'Test only',areas:['Test'],severity:'visoka',affectedClientIds:[client.data.id],reviewed:false}];
payload.audit.push({id:randomUUID(),ts:now,actor:'Fixture actor',action:'Unique audit fixture',target:'Test object',feature:'documents'});
fixtures.prepare('UPDATE firm_data SET payload=?, revision=revision+1 WHERE firm_id=?').run(JSON.stringify(payload),firms[0]);
fixtures.close();
const documentLink=docId=>`href="/dokumenti/${docId}"`;
const filteredDocs=await request('/dokumenti?q=Register&vrsta=Filter+fixture&redoslijed=naziv',{cookie:ana});
check(filteredDocs.text.includes(documentLink(sampleIds[0]))&&!filteredDocs.text.includes(documentLink(sampleIds[20])),'document filtering and first-page boundary');
const nextDocs=await request('/dokumenti?q=Register&vrsta=Filter+fixture&redoslijed=naziv&stranica=2',{cookie:ana});
check(nextDocs.text.includes(documentLink(sampleIds[20]))&&!nextDocs.text.includes(documentLink(sampleIds[0])),'document second page preserves filters');
check(!(await request('/dokumenti?status=analizirano',{cookie:ana})).text.includes(documentLink(sampleIds[0])),'analysis status excludes unprocessed documents');
check((await request('/dokumenti?stranica=-1',{cookie:ana})).res.status===200,'invalid page number handled safely');
check((await request('/zapisnik?korisnik=Fixture+actor&funkcija=documents',{cookie:ana})).text.includes('Unique audit fixture'),'activity actor and module filters');
check(!(await request('/zapisnik?korisnik=Missing',{cookie:ana})).text.includes('Unique audit fixture'),'activity empty filter excludes records');
check((await request('/propisi?q=Synthetic&vaznost=visoka',{cookie:ana})).text.includes('Synthetic regulation filter'),'regulation search and severity filters');
check(!(await request('/propisi?vaznost=niska',{cookie:ana})).text.includes('Synthetic regulation filter'),'regulation severity excludes unmatched record');
const notes=await request('/api/notifications',{cookie:ana});
check(notes.res.status===200&&notes.data.notifications.some(n=>n.kind==='regulation'&&n.title==='Synthetic regulation filter'),'notifications list unreviewed regulation changes');
check((await request('/api/notifications',{cookie:admin})).res.status===403,'platform admin has no firm notifications');
check((await request('/api/notifications')).res.status===401,'anonymous notifications denied');
check((await request('/api/propisi',{cookie:ivan,method:'POST',body:{id:regId,reviewed:true}})).res.status===403,'restricted firm cannot review another firm regulation');
check((await request('/api/propisi',{cookie:ana,method:'POST',body:{id:regId,reviewed:true}})).res.status===200,'regulation review saves');
check(!(await request('/propisi?prikaz=novo',{cookie:ana})).text.includes('Synthetic regulation filter')&&(await request('/propisi?prikaz=pregledano',{cookie:ana})).text.includes('Synthetic regulation filter'),'reviewed state persists on fresh page requests');
check((await request('/api/seed',{cookie:ana,method:'POST',body:{}})).res.status===404,'legacy reset removed');
check((await request('/api/n8n/callback',{method:'POST',body:{}})).res.status===401,'unauthenticated callback rejected');
for(const path of ['/','/dokumenti','/dokumenti/'+id,'/klijenti','/klijenti/'+client.data.id,'/provjera?dok='+id,'/pitanja','/propisi','/izvori','/zapisnik','/racun','/postavke']){
 const page=await request(path,{cookie:ana});check(page.res.status===200&&!page.text.includes('NEXT_REDIRECT'),'firm screen '+path);}
check((await request('/postavke',{cookie:ana})).text.includes('href="/izvori"'),'settings lists enabled modules');
check(!(await request('/postavke',{cookie:ivan})).text.includes('href="/izvori"'),'settings hides disabled modules');
check(!(await request('/',{cookie:ivan})).text.includes('Sintetički klijent QA'),'dashboard does not leak other firm data');
for(const path of ['/admin','/admin/firms','/admin/firms/new'])check((await request(path,{cookie:admin})).res.status===200,'admin screen '+path);
const created=await request('/api/admin/firms',{cookie:admin,method:'POST',body:{name:'QA privremeni ured',features:['documents'],status:'active',accent:'#806644'}});check(created.res.status===201 || created.res.status===200,'admin creates firm');
const firm=created.data.firm;
const invited=await request('/api/admin/users',{cookie:admin,method:'POST',body:{firmId:firm.id,name:'QA član',email:`qa-${Date.now()}@example.test`,role:'member'}});check(invited.res.status===201||invited.res.status===200,'admin invites firm user');
const inviteUrl=new URL(invited.data.invitationUrl);check(inviteUrl.pathname==='/poziv','invitation URL matches page');
check((await request(inviteUrl.pathname+inviteUrl.search)).res.status===200,'invitation acceptance page loads');
const token=inviteUrl.searchParams.get('token');const password='Only-for-isolated-QA-'+Date.now();
const accepted=await request('/api/auth/accept-invitation',{method:'POST',body:{token,password}});check(accepted.res.status===200,'invitation accepted');
check((await request('/api/auth/accept-invitation',{method:'POST',body:{token,password}})).res.status===400,'invitation cannot be reused');
const memberCookie=accepted.res.headers.get('set-cookie').split(';')[0];
const changed=await request('/api/admin/firms/'+firm.id,{cookie:admin,method:'PATCH',body:{features:[]}});check(changed.res.status===200,'admin changes features');
check((await request('/api/documents/unknown',{cookie:memberCookie})).res.status===403,'existing session immediately loses disabled module');
check((await request(evidencePath,{cookie:memberCookie})).res.status===403,'disabled documents blocks evidence requests');
await request('/api/admin/firms/'+firm.id,{cookie:admin,method:'PATCH',body:{status:'suspended'}});
check((await request('/api/documents/unknown',{cookie:memberCookie})).res.status===401,'firm suspension revokes session');
console.log(`${checks} HTTP checks passed.`);

} finally {
 server.kill('SIGTERM');
 await new Promise(resolve=>webhook.close(resolve));
 await new Promise(resolve=>server.exitCode!==null?resolve():server.once('exit',resolve));
 rmSync(directory,{recursive:true,force:true});
}
