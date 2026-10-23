/* Тесты эфемерид без зависимостей: node tests/ephemeris.test.js
   Ловят случайные правки таблиц и формул. Эталоны — официальные таблицы JPL, независимые формулы и известные значения. */
const E=require('../js/ephemeris.js');
const D=180/Math.PI;
let fails=0,total=0;
function check(name,ok,detail){total++;if(!ok)fails++;console.log((ok?'PASS ':'FAIL ')+name+(detail?'  ['+detail+']':''));}
const near=(a,b,tol)=>Math.abs(a-b)<=tol;
const lon=v=>((Math.atan2(v[1],v[0])*D)+360)%360;
const ang=(u,v)=>Math.acos(Math.min(1,(u[0]*v[0]+u[1]*v[1]+u[2]*v[2])/(Math.hypot(...u)*Math.hypot(...v))))*D;

/* 1. JPL «Approximate Positions of the Planets», Table 1 (1800–2050): a,e,I,L,ϖ,Ω и скорости на столетие */
const T1={
 mer:[[0.38709927,0.20563593,7.00497902,252.25032350,77.45779628,48.33076593],[0.00000037,0.00001906,-0.00594749,149472.67411175,0.16047689,-0.12534081]],
 ven:[[0.72333566,0.00677672,3.39467605,181.97909950,131.60246718,76.67984255],[0.00000390,-0.00004107,-0.00078890,58517.81538729,0.00268329,-0.27769418]],
 earth:[[1.00000261,0.01671123,-0.00001531,100.46457166,102.93768193,0.0],[0.00000562,-0.00004392,-0.01294668,35999.37244981,0.32327364,0.0]],
 mars:[[1.52371034,0.09339410,1.84969142,-4.55343205,-23.94362959,49.55953891],[0.00001847,0.00007882,-0.00813131,19140.30268499,0.44441088,-0.29257343]],
 jup:[[5.20288700,0.04838624,1.30439695,34.39644051,14.72847983,100.47390909],[-0.00011607,-0.00013253,-0.00183714,3034.74612775,0.21252668,0.20469106]],
 sat:[[9.53667594,0.05386179,2.48599187,49.95424423,92.59887831,113.66242448],[-0.00125060,-0.00050991,0.00193609,1222.49362201,-0.41897216,-0.28867794]],
 ura:[[19.18916464,0.04725744,0.77263783,313.23810451,170.95427630,74.01692503],[-0.00196176,-0.00004397,-0.00242939,428.48202785,0.40805281,0.04240589]],
 nep:[[30.06992276,0.00859048,1.77004347,-55.12002969,44.96476227,131.78422574],[0.00026291,0.00005105,0.00035372,218.45945325,-0.32241464,-0.00508664]],
 plu:[[39.48211675,0.24882730,17.14001206,238.92903833,224.06891629,110.30393684],[-0.00031596,0.00005170,0.00004818,145.20780515,-0.04062942,-0.01183482]]};
for(const k in T1){const [v,r]=T1[k];const want=[v[0],r[0],v[1],r[1],v[2],r[2],v[3],r[3],v[4],r[4],v[5],r[5]];
  check('таблица JPL Table 1: '+k,want.every((x,i)=>Math.abs(E.PLE[k][i]-x)<1e-9));}

/* 2. Table 2a ≈ Table 1 около J2000 и непрерывность на границах диапазона (оценка точности JPL — до ~0,5°) */
for(const k of ['mer','ven','earth','mars','jup','sat','ura','nep']){
  const a=E.PLE[k],b=E.PLE2[k];
  const dL=(a[6]-b[6]+540)%360-180;
  check('Table 2a близка к Table 1 на J2000: '+k,near(a[0],b[0],2e-3*a[0])&&near(a[2],b[2],2e-3)&&Math.abs(dL)<1.0,'ΔL='+dL.toFixed(3)+'°');
  let worst=0;for(const T of [-2.0001,0.5001]){
    const fine=E.helioEcl(k,T*36525);
    const save=E.PLE2[k];delete E.PLE2[k];const t1=E.helioEcl(k,T*36525);E.PLE2[k]=save;
    worst=Math.max(worst,ang(fine,t1));}
  check('непрерывность на 1800/2050: '+k,worst<0.5,worst.toFixed(3)+'°');}

/* 3. Оскулирующие элементы JPL SBDB (эпоха JD 2461200.5): независимый расчёт Кеплера сходится с helioEcl */
const SB={cer:[2.765552595034094,0.07969229514816586,10.58802780183462,80.24862682043221,73.29421453021587,274.4193463761342],
 hau:[43.06029023650952,0.1944430148898797,28.20847393040364,121.7860561329425,240.6905472508661,223.2104118812299],
 mak:[45.57093317300052,0.1588889953992523,29.02785603743067,79.2948338209406,297.0922733397207,169.9379962048232],
 eri:[67.93394687853566,0.4382385347971672,43.9258279471791,36.00477044417249,150.7949235840312,211.774434275007]};
const tmE=2461200.5-2451545.0;
for(const k in SB){const [a,e,i,O,w,M]=SB[k];const Mr=M/D;let Ea=Mr+e*Math.sin(Mr);for(let n=0;n<60;n++)Ea-=(Ea-e*Math.sin(Ea)-Mr)/(1-e*Math.cos(Ea));
  const xp=a*(Math.cos(Ea)-e),yp=a*Math.sqrt(1-e*e)*Math.sin(Ea),om=w/D,Om=O/D,I=i/D;
  const ref=[(Math.cos(om)*Math.cos(Om)-Math.sin(om)*Math.sin(Om)*Math.cos(I))*xp+(-Math.sin(om)*Math.cos(Om)-Math.cos(om)*Math.sin(Om)*Math.cos(I))*yp,
   (Math.cos(om)*Math.sin(Om)+Math.sin(om)*Math.cos(Om)*Math.cos(I))*xp+(-Math.sin(om)*Math.sin(Om)+Math.cos(om)*Math.cos(Om)*Math.cos(I))*yp,
   Math.sin(om)*Math.sin(I)*xp+Math.cos(om)*Math.sin(I)*yp];
  const got=E.helioEcl(k,tmE);const d=Math.hypot(got[0]-ref[0],got[1]-ref[1],got[2]-ref[2])/a;
  check('SBDB на эпоху: '+k,d<1e-9,d.toExponential(1));
  const P=360/E.PLE[k][7]*36525,back=E.helioEcl(k,tmE+P);
  check('возврат за период: '+k,Math.hypot(back[0]-got[0],back[1]-got[1],back[2]-got[2])/a<1e-9);}

/* 4. Известные значения */
const rr=(k,jd)=>Math.hypot(...E.helioEcl(k,jd-2451545.0));
check('Плутон 14.07.2015 ≈ 32.9 а.е. (пролёт New Horizons)',near(rr('plu',2457217.5),32.9,0.15),rr('plu',2457217.5).toFixed(3));
{let q=1e9;for(let jd=2447000;jd<=2449500;jd+=5)q=Math.min(q,rr('plu',jd));check('перигелий Плутона ≈ 29.66 а.е.',near(q,29.66,0.05),q.toFixed(3));}
{let m=0;for(let jd=2450000;jd<=2452000;jd+=3)m=Math.max(m,rr('mer',jd));check('афелий Меркурия ≈ 0.4667 а.е.',near(m,0.4667,0.001),m.toFixed(4));}
check('Марс 27.08.2003 ≈ 1.38 а.е. от Солнца',near(rr('mars',2452878.5),1.38,0.01),rr('mars',2452878.5).toFixed(3));
{const e=E.helioEcl('earth',0);check('Земля на J2000: долгота ≈ 100.37° и r ≈ 0.9833 а.е.',near(lon(e),100.37,0.15)&&near(Math.hypot(...e),0.9833,0.0005),lon(e).toFixed(3)+'°, '+Math.hypot(...e).toFixed(5));}
check('звёздное время (ERA) на J2000 = 280.4606°',near(((E.earthSpinAngle(0)-Math.PI/2)*D),280.4606,1e-3));
{const tm=2448724.5-2451545.0,T=tm/36525,v=E.moonGeoEcl(tm);const l=(lon(v)+1.3969713*T),b=Math.asin(v[2])*D;
 check('Луна (Meeus, пример 47.a, 12.04.1992): λ≈133.163°, β≈−3.229°',near(l,133.1627,0.05)&&near(b,-3.2291,0.02),'λ='+l.toFixed(4)+' β='+b.toFixed(4));}

/* 5. Устойчивость: нет NaN и разумные расстояния на диапазоне 3000 до н.э. – 3000 н.э. */
{let bad=0;for(const k of ['mer','ven','earth','mars','jup','sat','ura','nep','plu','cer','hau','mak','eri'])for(let y=-3000;y<=3000;y+=37){const v=E.helioEcl(k,(y-2000)*365.25);const r=Math.hypot(...v);if(!v.every(Number.isFinite)||r<0.2||r>110)bad++;}
 check('конечные значения и разумные расстояния на ±3000 лет',bad===0,bad+' плохих');}

console.log('\n'+(total-fails)+'/'+total+' проверок пройдено');
process.exit(fails?1:0);
