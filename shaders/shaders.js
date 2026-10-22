/* GLSL-шейдеры проекта. Подключается до основного скрипта; в коде используются как SHD.<имя>. */
window.SW_SHADERS={
  uvVert:`
varying vec2 vUv;
void main(){
  vUv=uv;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}
`,
  skyTexFrag:`
uniform sampler2D uTex;
uniform float uBright;
uniform float uDim;
uniform float uLinear;
uniform float uSkyGamma;
varying vec2 vUv;
void main(){
  vec3 c0=texture2D(uTex,vUv).rgb;
  vec3 c=(uSkyGamma>1.001)?pow(c0,vec3(uSkyGamma)):c0;
  vec3 cG=pow(c,vec3(1.0/max(uBright,0.01)));
  vec3 cL=c*uBright;
  gl_FragColor=vec4(mix(cG,cL,uLinear)*uDim,1.0);
}
`,
  atmVert:`
varying vec3 vP;
void main(){
  vP=position;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}
`,
  atmFrag:(ATM_STEPS)=>`
uniform vec3 uC;
uniform vec3 uS;
uniform vec3 uB;
uniform float uRp;
uniform float uQ;
uniform float uH;
uniform float uK;
uniform float uM;
uniform float uI;
varying vec3 vP;
void main(){
  vec3 P=vec3(vP.x,vP.y/uQ,vP.z);
  vec3 C0=vec3(uC.x,uC.y/uQ,uC.z);
  vec3 S0=normalize(vec3(uS.x,uS.y/uQ,uS.z));
  vec3 d=normalize(P-C0);
  float b=dot(P,d);
  float tf=-2.*b;
  float c=dot(P,P)-uRp*uRp;
  float disc=b*b-c;
  float te=tf;
  if(disc>0.&&b<0.)te=min(tf,-b-sqrt(disc));
  float dt=te/${ATM_STEPS}.;
  float mu=dot(S0,d);
  float g=.76;
  float ph=mix(.75*(1.+mu*mu),.48*(1.-g*g)/pow(1.+g*g-2.*g*mu,1.5),uM);
  vec3 sc=vec3(0.);
  float tv=0.;
  for(int i=0;i<${ATM_STEPS};i++){
    vec3 p=P+d*((float(i)+.5)*dt);
    float ln=length(p);
    float rho=exp(-(ln-uRp)/uH*uK);
    float bq=dot(p,S0);
    float dd=bq*bq-(ln*ln-uRp*uRp);
    float occ=0.;
    if(bq<0.)occ=smoothstep(0.,.04,dd);
    float ts=rho*uH*34./(max(bq/ln,0.)+.15);
    sc+=uB*(rho*dt*ph*(1.-occ))*exp(-uB*(ts+tv));
    tv+=rho*dt*20.*uH;
  }
  gl_FragColor=vec4(1.-exp(-sc*uI*26.),1.);
}
`,
  normUniforms:`
uniform float uNormLitFrom;
uniform float uNormLitTo;
uniform float uNrmOpacity;
uniform float uNrmGamma;
uniform float uNrmDepth;
uniform float uNrmSwapRG;
uniform float uNrmRot180;
`,
  normFragMaps:`
#include <normal_fragment_maps>
{
  float _litF = smoothstep(uNormLitFrom, uNormLitTo, dot(_nSaved, normalize(uSunDir))) * uNrmOpacity;
  normal = normalize(mix(_nSaved, normal, _litF));
}
`,
  ringShadowFrag:`
{
  vec3 Lr=normalize(uSun-vRel);
  float dn=dot(Lr,uN);
  float sh=1.;
  if(abs(dn)>.0001){
    float tt=-dot(vRel,uN)/dn;
    if(tt>0.){
      vec3 Hh=vRel+Lr*tt;
      float uu=(length(Hh)/uS-1.3)/1.1;
      if(uu>0.&&uu<1.)sh=1.-.9*texture2D(uRT,vec2(uu,.5)).a;
    }
  }
  reflectedLight.directDiffuse*=sh;
  reflectedLight.directSpecular*=sh;
}
`,
  ellipsoidShadowFrag:`
{
  vec3 Lr=normalize(uSun-vRel);
  vec3 Rn=uN*dot(vRel,uN);
  vec3 Rp=vRel-Rn;
  vec3 Ln=uN*dot(Lr,uN);
  vec3 Lp=Lr-Ln;
  vec3 R2=Rp/uA+Rn/uCc;
  vec3 L2=Lp/uA+Ln/uCc;
  float A2=dot(L2,L2);
  float B2=dot(R2,L2);
  float D2=B2*B2-A2*(dot(R2,R2)-1.);
  float sh=1.;
  if(D2>0.&&B2<0.)sh=1.-.92*smoothstep(0.,.05,D2/A2);
  reflectedLight.directDiffuse*=sh;
  reflectedLight.directSpecular*=sh;
}
`,
  ringShadowUniforms:`
uniform vec3 uSun;
uniform vec3 uN;
uniform float uS;
uniform float uA;
uniform float uCc;
uniform sampler2D uRT;
varying vec3 vRel;
`,
  nightEmissiveFrag:`
#include <emissivemap_fragment>
totalEmissiveRadiance*=1.-smoothstep(-.04,.10,dot(normalize(normal),uSunV));
`,
  starVert:`
attribute vec3 aCol;
attribute float aMag;
uniform float uPx;
uniform float uLim;
varying vec3 vC;
void main(){
  float s=clamp(1.0+(5.0-aMag)*0.45,1.0,5.0);
  vC=aCol*clamp(1.05-(aMag-1.0)*0.13,0.3,1.0)*(1.0-smoothstep(uLim-0.7,uLim+0.3,aMag));
  gl_PointSize=s*uPx;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}
`,
  starFrag:`
varying vec3 vC;
void main(){
  float d=length(gl_PointCoord-0.5)*2.0;
  if(d>1.0)discard;
  gl_FragColor=vec4(vC*(1.0-d*d),1.0);
}
`,
  moonVert:`
varying vec3 vN;
void main(){
  vN=normal;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}
`,
  moonFrag:`
uniform vec3 uSun;
varying vec3 vN;
void main(){
  float l=smoothstep(-0.03,0.03,dot(normalize(vN),uSun));
  gl_FragColor=vec4(vec3(0.84,0.82,0.77)*(0.05+0.95*l),1.0);
}
`,
  posVert:`
varying vec3 vP;
void main(){
  vP=position;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}
`,
  skyDomeFrag:`
uniform vec3 uSun;
uniform vec3 uUp;
uniform vec3 uMoon;
uniform float uMK;
uniform float uK;
varying vec3 vP;
void main(){
  vec3 d=normalize(vP);
  float sa=dot(uSun,uUp);
  float e=max(dot(d,uUp),0.0);
  float cs=max(dot(d,uSun),0.0);
  float day=smoothstep(-0.12,0.10,sa);
  float nk=smoothstep(-0.31,-0.08,sa);
  float tw=exp(-pow((degrees(asin(clamp(sa,-1.0,1.0)))+2.0)/5.5,2.0));
  vec3 zen=vec3(0.03,0.06,0.17)*nk*(1.0-day)+vec3(0.14,0.37,0.86)*day;
  vec3 hor=mix(vec3(0.05,0.08,0.19)*nk,vec3(0.62,0.77,1.0),day);
  vec3 base=mix(zen,hor,pow(1.0-e,2.5));
  vec3 gl=tw*pow(cs,3.0)*pow(1.0-e,1.5)*vec3(1.0,0.45,0.18)*1.1+tw*pow(1.0-e,6.0)*vec3(0.55,0.22,0.12)*0.35;
  float halo=pow(cs,48.0)*0.55+pow(cs,6.0)*0.12*day;
  float cm=max(dot(d,uMoon),0.0);
  vec3 night=vec3(0.018,0.036,0.088)*(1.0-day)*(0.55+0.9*pow(1.0-e,2.0));
  vec3 ml=vec3(0.055,0.105,0.23)*uMK*(0.5+0.5*(1.0-e))+vec3(0.75,0.85,1.0)*uMK*(pow(cm,90.0)*0.5+pow(cm,10.0)*0.07);
  gl_FragColor=vec4((base+gl+halo*vec3(1.0,0.9,0.7)+night+ml)*uK,1.0);
}
`,
  horizonFrag:`
uniform sampler2D uTex;
uniform float uHas;
uniform float uA;
uniform float uMK;
uniform vec3 uE;
uniform vec3 uN;
uniform vec3 uUp;
uniform vec3 uSun;
uniform vec3 uMoon;
varying vec3 vP;
void main(){
  vec3 d=normalize(vP);
  float uu=dot(d,uUp);
  float el=asin(clamp(uu,-1.0,1.0));
  float az=atan(dot(d,uE),dot(d,uN));
  vec2 uv=vec2(0.5+az/6.2831853,0.5+el/3.1415927);
  vec4 t=uHas>0.5?texture2D(uTex,uv):vec4(vec3(0.17,0.27,0.12)*step(uu,0.0),step(uu,0.0));
  vec3 hn=normalize(d-uUp*uu+uE*1e-5);
  vec3 nrm=normalize(mix(uUp,-hn*0.8+uUp*0.4,step(0.0,uu)));
  float sa=dot(uSun,uUp);
  float day=smoothstep(-0.12,0.08,sa);
  float nk=smoothstep(-0.31,-0.05,sa);
  float tw=exp(-pow((degrees(asin(clamp(sa,-1.0,1.0)))+2.0)/5.5,2.0));
  vec3 sunCol=mix(vec3(1.0,0.52,0.28),vec3(1.0,0.95,0.86),smoothstep(0.0,0.4,sa));
  float sunI=smoothstep(-0.02,0.10,sa)*0.65*max(dot(nrm,uSun),0.0);
  vec3 amb=vec3(0.018,0.030,0.065)*(1.0-day)+vec3(0.05,0.07,0.13)*nk*(1.0-day)+vec3(0.38,0.46,0.62)*day+tw*vec3(0.10,0.07,0.07);
  vec3 L=amb+sunCol*sunI+vec3(0.50,0.62,0.90)*uMK*(0.10+0.16*max(dot(nrm,uMoon),0.0));
  vec3 rgb=t.rgb*L;
  vec3 fog=vec3(0.60,0.74,0.96)*day+vec3(0.03,0.05,0.11)*(1.0-day)*(0.4+0.6*nk)+tw*vec3(0.35,0.17,0.10);
  float hz=exp(-abs(el)*16.0)*0.30;
  rgb=mix(rgb,fog*t.a,hz*t.a);
  gl_FragColor=vec4(rgb,t.a)*uA;
}
`
};
