/* Тесты магнитного склонения без зависимостей: node tests/geomag.test.js
   Эталоны — значения независимой реализации WMM2025 (npm-пакет geomagnetism 0.2.0), посчитанные заранее;
   на глобальной сетке 5°×10° расхождение с ней было ≤ 0,02°. */
const G=require('../js/geomag.js');
let fails=0,total=0;
function check(name,ok,detail){total++;if(!ok)fails++;console.log((ok?'PASS ':'FAIL ')+name+(detail?'  ['+detail+']':''));}
const angDiff=(a,b)=>Math.abs(((a-b+540)%360)-180);
const T1=Date.UTC(2026,9,27),T2=Date.UTC(2028,5,1);
const REF=[
 ['Кропивницкий',48.51,32.26,8.216,8.323],['Киев',50.45,30.52,8.54,8.669],['Лондон',51.5,-0.12,1.22,1.492],
 ['Токио',35.68,139.69,-7.938,-7.999],['Сан-Франциско',37.77,-122.42,12.827,12.683],['Сидней',-33.87,151.21,12.828,12.863],
 ['Рио',-22.9,-43.2,-23.008,-23.041],['Мыс Доброй Надежды',-34.36,18.47,-27.24,-27.609],['Рейкьявик',64.15,-21.94,-11.039,-10.564],
 ['Экватор/Гринвич',0,0,-3.792,-3.594]];
for(const [n,la,lo,d1,d2] of REF){
 const a=G.declination(la,lo,T1),b=G.declination(la,lo,T2);
 check('склонение '+n+' 27.10.2026',angDiff(a,d1)<0.05,a.toFixed(3)+' vs '+d1);
 check('склонение '+n+' 01.06.2028 (вековой ход)',angDiff(b,d2)<0.05,b.toFixed(3)+' vs '+d2);
}
check('Украина: склонение восточное, 7–10°',[[48.51,32.26],[50.45,30.52],[49.84,24.03],[46.48,30.73]].every(([la,lo])=>{const d=G.declination(la,lo,T1);return d>7&&d<10;}));
let bad=0;for(let la=-90;la<=90;la+=15)for(let lo=-180;lo<=180;lo+=30){const d=G.declination(la,lo,T1);if(!isFinite(d)||Math.abs(d)>180)bad++;}
check('конечные значения на сетке, включая полюса',bad===0,bad+' плохих');
check('по умолчанию берётся текущая дата',isFinite(G.declination(48.5,32.3)));
console.log('\n'+(total-fails)+'/'+total+' проверок пройдено');
process.exit(fails?1:0);
