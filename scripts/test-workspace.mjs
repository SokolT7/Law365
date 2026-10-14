import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const directory=mkdtempSync(path.join(tmpdir(),'ltb-workspace-tests-'));
try {
  for(const name of ['list-query','docs','deadlines']) {
    const compiled=ts.transpileModule(readFileSync(`src/lib/${name}.ts`,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replaceAll('"./docs"','"./docs.mjs"');
    writeFileSync(path.join(directory,`${name}.mjs`),compiled);
  }
  const {calendarDay,collectDeadlines}=await import(pathToFileURL(path.join(directory,'deadlines.mjs')));
  const {paginate,listHref,queryValue}=await import(pathToFileURL(path.join(directory,'list-query.mjs')));
  assert.equal(calendarDay('2026-02-30'),null);
  assert.equal(calendarDay('03/04/2026'),null);
  assert.equal(calendarDay('2026-03-28T23:30:00Z'),'2026-03-29');
  const doc={id:'test',title:'Test',analyses:[{mode:'sazetak',status:'analizirano',result:{datumiIRokovi:[{opis:'Yesterday',datum:'2026-03-28'},{opis:'Today',datum:'2026-03-29'},{opis:'Tomorrow',datum:'2026-03-30'},{opis:'Invalid',datum:'2026-02-30'}]}}]};
  const dates=collectDeadlines([doc],new Date('2026-03-28T23:30:00Z'));
  assert.deepEqual(dates.past.map(d=>d.description),['Yesterday']);
  assert.deepEqual(dates.upcoming.map(d=>d.description),['Today','Tomorrow']);
  assert.equal(dates.upcoming[0].today,true);
  assert.equal(paginate([1,2,3],'-1',2).page,1);
  assert.deepEqual(paginate([1,2,3],'999',2).items,[3]);
  assert.equal(paginate([],'2').start,0);
  assert.equal(queryValue({q:['a','b']},'q'),'');
  assert.equal(listHref('/dokumenti',{q:'A & B',stranica:2}),'/dokumenti?q=A+%26+B&stranica=2');
  console.log('11 workspace checks passed (timezone, invalid dates, pagination, and URL state).');
} finally {rmSync(directory,{recursive:true,force:true});}
