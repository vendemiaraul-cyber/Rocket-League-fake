// Rocket Strike physics for the server. The functions below are copied from public/index.html
// (stepCar, stepBall, carBall, carPush, botThink) with the visual effects removed, so the server's
// match plays exactly like the browser's. Keep the two in sync when changing the physics.

// ---- the bits of three.js math the physics uses (same formulas) ----
export class V3{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
  clone(){return new V3(this.x,this.y,this.z);}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
  subVectors(a,b){this.x=a.x-b.x;this.y=a.y-b.y;this.z=a.z-b.z;return this;}
  addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this;}
  multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this;}
  divideScalar(s){return this.multiplyScalar(1/s);}
  dot(v){return this.x*v.x+this.y*v.y+this.z*v.z;}
  crossVectors(a,b){const ax=a.x,ay=a.y,az=a.z,bx=b.x,by=b.y,bz=b.z;this.x=ay*bz-az*by;this.y=az*bx-ax*bz;this.z=ax*by-ay*bx;return this;}
  cross(v){return this.crossVectors(this,v);}
  lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z;}
  length(){return Math.sqrt(this.lengthSq());}
  normalize(){return this.divideScalar(this.length()||1);}
  distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z);}
  lerp(v,t){this.x+=(v.x-this.x)*t;this.y+=(v.y-this.y)*t;this.z+=(v.z-this.z)*t;return this;}
  applyQuaternion(q){
    const vx=this.x,vy=this.y,vz=this.z,qx=q.x,qy=q.y,qz=q.z,qw=q.w;
    const tx=2*(qy*vz-qz*vy),ty=2*(qz*vx-qx*vz),tz=2*(qx*vy-qy*vx);
    this.x=vx+qw*tx+qy*tz-qz*ty;this.y=vy+qw*ty+qz*tx-qx*tz;this.z=vz+qw*tz+qx*ty-qy*tx;return this;
  }
}
export class Quat{
  constructor(x=0,y=0,z=0,w=1){this.x=x;this.y=y;this.z=z;this.w=w;}
  set(x,y,z,w){this.x=x;this.y=y;this.z=z;this.w=w;return this;}
  copy(q){this.x=q.x;this.y=q.y;this.z=q.z;this.w=q.w;return this;}
  setFromAxisAngle(a,ang){const s=Math.sin(ang/2);this.x=a.x*s;this.y=a.y*s;this.z=a.z*s;this.w=Math.cos(ang/2);return this;}
  multiplyQuaternions(a,b){
    const qax=a.x,qay=a.y,qaz=a.z,qaw=a.w,qbx=b.x,qby=b.y,qbz=b.z,qbw=b.w;
    this.x=qax*qbw+qaw*qbx+qay*qbz-qaz*qby;this.y=qay*qbw+qaw*qby+qaz*qbx-qax*qbz;
    this.z=qaz*qbw+qaw*qbz+qax*qby-qay*qbx;this.w=qaw*qbw-qax*qbx-qay*qby-qaz*qbz;return this;
  }
  multiply(q){return this.multiplyQuaternions(this,q);}
  premultiply(q){return this.multiplyQuaternions(q,this);}
  normalize(){let l=Math.hypot(this.x,this.y,this.z,this.w);if(l===0){this.x=this.y=this.z=0;this.w=1;}else{l=1/l;this.x*=l;this.y*=l;this.z*=l;this.w*=l;}return this;}
  invert(){this.x*=-1;this.y*=-1;this.z*=-1;return this;}
}
const V=(x=0,y=0,z=0)=>new V3(x,y,z);

// ---- constants (same values as public/index.html) ----
export const AX=58,AZ=82,RAMP=8,GW=12,GH=9.5,GD=9,CUT=16,CORNER=AX+AZ-CUT,SPAWN_Z=54;
export const BALL_R=1.9,BALL_G=-17;
export const GRAV=-25,JUMP_V=10.5,BOOST_ACC=34,MAX_DRIVE=26,MAX_SPEED=44,FLIP_DUR=0.62,CAR_H=0.8;
const clamp=(x,a,b)=>x<a?a:x>b?b:x;
const lerp=(a,b,t)=>a+(b-a)*t;
const wrapA=a=>Math.atan2(Math.sin(a),Math.cos(a));
const Yax=V(0,1,0),sF=V(),sR=V(),sT=V(),sA=V(),sQ=new Quat(),tv=V();
const HB_H=V(0.95,0.6,2.46),HB_O=V(0,0.1,0.01);
const qi=new Quat(),lp=V(),cl=V(),nW=V(),cW=V(),rv=V(),cpt=V(),dl=V();

// The physics works on one ball at a time; the match sets these before stepping.
export let BALL=null;
export const LAST={touch:null};
export function useBall(b){BALL=b;}
export function makeBall(){return {pos:V(0,BALL_R,0),vel:V(),spin:V(),onGround:true,scored:false};}
export function makeCar(team){
  return {team,nick:'',active:false,pos:V(0,CAR_H,0),vel:V(),q:new Quat(),angVel:V(),yaw:0,grounded:true,jumpT:9,canFlip:false,
    flipT:-1,boost:33,boosting:false,inp:{throttle:0,steer:0,pitch:0,roll:0,boost:false,jumpPressed:false},hitCD:0,ai:{flipAt:0}};
}
export function placeCar(c,p,yaw){c.pos.copy(p);c.vel.set(0,0,0);c.yaw=yaw;c.q.setFromAxisAngle(Yax,yaw);c.angVel.set(0,0,0);
  c.grounded=true;c.jumpT=9;c.canFlip=false;c.flipT=-1;c.boost=33;c.hitCD=0;}
export function spawnFor(r){const xs=r[3]===1?[0]:r[3]===2?[-9,9]:[-14,0,14];return {pos:V(xs[r[2]]||0,CAR_H,r[1]===0?SPAWN_Z:-SPAWN_Z),yaw:r[1]===0?Math.PI:0};}

export function stepCar(c,h){
  const inp=c.inp;c.jumpT+=h;c.hitCD-=h;
  sF.set(0,0,1).applyQuaternion(c.q);
  c.boosting=inp.boost&&c.boost>0;
  if(c.boosting){c.vel.addScaledVector(sF,BOOST_ACC*h);c.boost=Math.max(0,c.boost-33.3*h);}
  if(c.grounded){
    sF.set(Math.sin(c.yaw),0,Math.cos(c.yaw));sR.set(Math.cos(c.yaw),0,-Math.sin(c.yaw));
    let vf=c.vel.dot(sF),vl=c.vel.dot(sR);
    const turn=lerp(2.8,1.5,clamp(Math.abs(vf)/40,0,1))*clamp(Math.abs(vf)/5+0.15,0,1);
    c.yaw-=inp.steer*turn*h*(vf<-0.5?-1:1);
    const t=inp.throttle;
    if(t>0.05)vf+=(vf<0?45:26*clamp(1-vf/MAX_DRIVE,0,1))*t*h;
    else if(t<-0.05)vf+=(vf>0?45:20*clamp(1+vf/15,0,1))*t*h;
    else vf-=Math.sign(vf)*Math.min(Math.abs(vf),6*h);
    vl*=Math.exp(-14*h);
    sF.set(Math.sin(c.yaw),0,Math.cos(c.yaw));sR.set(Math.cos(c.yaw),0,-Math.sin(c.yaw));
    c.vel.set(sF.x*vf+sR.x*vl,c.vel.y,sF.z*vf+sR.z*vl);
    c.q.setFromAxisAngle(Yax,c.yaw);c.angVel.set(0,0,0);
    if(inp.jumpPressed){inp.jumpPressed=false;c.vel.y=JUMP_V;c.grounded=false;c.jumpT=0;c.canFlip=true;c.flipT=-1;c.pos.y+=0.03;}
  }else{
    if(inp.jumpPressed){
      inp.jumpPressed=false;
      if(c.canFlip&&c.jumpT<1.5){
        c.canFlip=false;
        const px=inp.pitch,sx=inp.steer,m=Math.hypot(px,sx);
        if(m>0.3){
          sF.set(0,0,1).applyQuaternion(c.q);sF.y=0;if(sF.lengthSq()<1e-4)sF.set(Math.sin(c.yaw),0,Math.cos(c.yaw));sF.normalize();
          sR.set(-sF.z,0,sF.x);
          const k=10/Math.max(1,m);
          c.vel.addScaledVector(sF,px*k).addScaledVector(sR,sx*k);c.vel.y=Math.max(c.vel.y,0)*0.3;
          sA.set(px,0,sx).normalize().applyQuaternion(c.q);c.angVel.copy(sA).multiplyScalar(Math.PI*2/FLIP_DUR);c.flipT=0;
        }else c.vel.y+=8;
      }
    }
    if(c.flipT>=0){c.flipT+=h;if(c.flipT>=FLIP_DUR){c.flipT=-1;c.angVel.multiplyScalar(0.1);}}
    else{sA.set(inp.pitch*3.8,-inp.steer*3.0,inp.roll*4.2).applyQuaternion(c.q);c.angVel.lerp(sA,1-Math.exp(-6*h));}
    const w=c.angVel.length();if(w>1e-5){sQ.setFromAxisAngle(sT.copy(c.angVel).divideScalar(w),w*h);c.q.premultiply(sQ).normalize();}
  }
  c.vel.y+=GRAV*h;
  const sp=c.vel.length();if(sp>MAX_SPEED)c.vel.multiplyScalar(MAX_SPEED/sp);
  c.pos.addScaledVector(c.vel,h);
  if(c.pos.y<=CAR_H){
    c.pos.y=CAR_H;
    if(!c.grounded&&c.vel.y<=0){
      c.grounded=true;c.flipT=-1;c.canFlip=false;
      sF.set(0,0,1).applyQuaternion(c.q);
      if(Math.hypot(sF.x,sF.z)>0.15)c.yaw=Math.atan2(sF.x,sF.z);
      c.q.setFromAxisAngle(Yax,c.yaw);c.angVel.set(0,0,0);
    }
    if(c.vel.y<0)c.vel.y=0;
  }
  // arena bounds: side ramps begin at |x|=AX-RAMP, chamfered corners, recessed goals
  const ax=Math.abs(c.pos.x),sx=Math.sign(c.pos.x)||1,XL=AX-RAMP-0.6;
  if(ax>XL){c.pos.x=sx*XL;if(c.vel.x*sx>0)c.vel.x*=-0.3;}
  const inMouth=Math.abs(c.pos.x)<GW-1.4&&c.pos.y<GH-0.9;
  const az=Math.abs(c.pos.z),sz=Math.sign(c.pos.z)||1;
  if(az>AZ-2&&az<=AZ-0.5&&!inMouth){c.pos.z=sz*(AZ-2);if(c.vel.z*sz>0)c.vel.z*=-0.3;}
  if(Math.abs(c.pos.z)>AZ-0.5){
    if(Math.abs(c.pos.x)>GW-1.4){c.pos.x=Math.sign(c.pos.x)*(GW-1.4);c.vel.x*=-0.3;}
    if(c.pos.y>GH-0.9){c.pos.y=GH-0.9;if(c.vel.y>0)c.vel.y=0;}
    if(Math.abs(c.pos.z)>AZ+GD-2.4){c.pos.z=sz*(AZ+GD-2.4);if(c.vel.z*sz>0)c.vel.z*=-0.3;}
  }else{
    const cd=(Math.abs(c.pos.x)+Math.abs(c.pos.z)-(CORNER-2.6))/Math.SQRT2;
    if(cd>0){const nx=(Math.sign(c.pos.x)||1)/Math.SQRT2,nz=sz/Math.SQRT2;c.pos.x-=nx*cd;c.pos.z-=nz*cd;const vn=c.vel.x*nx+c.vel.z*nz;if(vn>0){c.vel.x-=1.3*vn*nx;c.vel.z-=1.3*vn*nz;}}
  }
  if(c.pos.y>48){c.pos.y=48;if(c.vel.y>0)c.vel.y=0;}
}
export function carPush(a,b){
  const d=sT.subVectors(a.pos,b.pos);const L=d.length();if(L>3.4||L<1e-4)return;d.divideScalar(L);
  a.pos.addScaledVector(d,3.4-L);const rel=sA.subVectors(a.vel,b.vel).dot(d);if(rel<0)a.vel.addScaledVector(d,-1.15*rel);
}
export function carBall(c){
  cW.copy(HB_O).applyQuaternion(c.q).add(c.pos);qi.copy(c.q).invert();
  lp.copy(BALL.pos).sub(cW).applyQuaternion(qi);
  cl.set(clamp(lp.x,-HB_H.x,HB_H.x),clamp(lp.y,-HB_H.y,HB_H.y),clamp(lp.z,-HB_H.z,HB_H.z));
  dl.subVectors(lp,cl);let d=dl.length();
  if(d>=BALL_R)return;
  if(d<1e-4){dl.set(0,1,0);d=0;}else dl.divideScalar(d);
  nW.copy(dl).applyQuaternion(c.q);
  BALL.pos.addScaledVector(nW,BALL_R-d+0.001);
  cpt.copy(cl).applyQuaternion(c.q).add(cW);
  rv.copy(c.angVel).cross(sT.subVectors(cpt,c.pos)).add(c.vel);
  rv.subVectors(BALL.vel,rv);
  const vn=rv.dot(nW);
  if(vn<0){
    BALL.vel.addScaledVector(nW,-1.55*vn);
    const aerial=!c.grounded&&BALL.pos.y>4.2;
    if(c.hitCD<=0){
      const dir=sT.subVectors(BALL.pos,c.pos);dir.y*=0.35;dir.normalize();
      BALL.vel.addScaledVector(dir,clamp(-vn*0.42,0,20)+2);c.hitCD=0.1;
      const strength=-vn;
      LAST.touch={team:c.team,name:c.nick,aerial};
    }
    c.vel.addScaledVector(nW,vn*0.06);
    BALL.spin.crossVectors(nW,rv).multiplyScalar(0.25/BALL_R);
    const s=BALL.vel.length();if(s>62)BALL.vel.multiplyScalar(62/s);
  }
}
export function stepBall(h){
  const B=BALL,R=BALL_R;
  B.vel.y+=BALL_G*h;B.vel.multiplyScalar(Math.exp(-0.03*h));B.pos.addScaledVector(B.vel,h);
  if(B.pos.y<R){B.pos.y=R;if(B.vel.y<0)B.vel.y=B.vel.y<-2.5?-B.vel.y*0.6:0;const f=Math.exp(-0.3*h);B.vel.x*=f;B.vel.z*=f;}
  B.onGround=B.pos.y<R+0.05;
  if(B.pos.y>50-R){B.pos.y=50-R;if(B.vel.y>0)B.vel.y*=-0.6;}
  const ax=Math.abs(B.pos.x),sx=Math.sign(B.pos.x)||1,RX=AX-RAMP;
  if(ax>RX&&B.pos.y<RAMP){
    const dx=ax-RX,dy=B.pos.y-RAMP,L=Math.hypot(dx,dy),lim=RAMP-R;
    if(L>lim){const nx=-dx/L,ny=-dy/L;B.pos.x=sx*(RX+dx/L*lim);B.pos.y=RAMP+dy/L*lim;
      const vx=B.vel.x*sx,vy=B.vel.y,vn=vx*nx+vy*ny;if(vn<0){B.vel.x=(vx-1.6*vn*nx)*sx;B.vel.y=vy-1.6*vn*ny;}}
  }else if(ax>AX-R){B.pos.x=sx*(AX-R);if(B.vel.x*sx>0)B.vel.x*=-0.6;}
  const az=Math.abs(B.pos.z),sz=Math.sign(B.pos.z)||1;
  const inMouth=Math.abs(B.pos.x)<GW-R*0.4&&B.pos.y<GH-R*0.4;
  if(az>AZ-R&&az<=AZ&&!inMouth){B.pos.z=sz*(AZ-R);if(B.vel.z*sz>0)B.vel.z*=-0.6;}
  if(Math.abs(B.pos.z)>AZ){
    if(Math.abs(B.pos.x)>GW-R){B.pos.x=Math.sign(B.pos.x)*(GW-R);B.vel.x*=-0.5;}
    if(B.pos.y>GH-R){B.pos.y=GH-R;if(B.vel.y>0)B.vel.y*=-0.5;}
    if(Math.abs(B.pos.z)>AZ+GD-R){B.pos.z=sz*(AZ+GD-R);if(B.vel.z*sz>0)B.vel.z*=-0.5;}
  }else{
    const cd=(Math.abs(B.pos.x)+Math.abs(B.pos.z)-CORNER)/Math.SQRT2+R;
    if(cd>0){const nx=(Math.sign(B.pos.x)||1)/Math.SQRT2,nz=sz/Math.SQRT2;B.pos.x-=nx*cd;B.pos.z-=nz*cd;const vn=B.vel.x*nx+B.vel.z*nz;if(vn>0){B.vel.x-=1.6*vn*nx;B.vel.z-=1.6*vn*nz;}}
  }
}
export function botThink(b,now){
  const inp=b.inp,B=BALL.pos,atk=b.team===1?1:-1;
  sF.set(0,0,1).applyQuaternion(b.q);
  const yawNow=b.grounded?b.yaw:Math.atan2(sF.x,sF.z);
  const pb=tv.copy(B).addScaledVector(BALL.vel,0.3);pb.x=clamp(pb.x,-(AX-10),AX-10);pb.z=clamp(pb.z,-(AZ-2),AZ-2);
  let dx=clamp(pb.x*0.3,-6,6)-pb.x,dz=AZ*atk-pb.z;const L=Math.hypot(dx,dz)||1;dx/=L;dz/=L;
  let tx=pb.x-dx*(BALL_R+2.2),tz=pb.z-dz*(BALL_R+2.2);
  const behind=(b.pos.z-B.z)*atk>1.0;
  if(behind){tz=clamp(B.z-atk*10,-(AZ-4),AZ-4);tx=B.x+(b.pos.x>=B.x?7:-7);}
  const ex=tx-b.pos.x,ez=tz-b.pos.z,dist=Math.hypot(ex,ez);
  const ang=wrapA(Math.atan2(ex,ez)-yawNow);
  inp.steer=clamp(-ang*2.4,-1,1);
  inp.throttle=(Math.abs(ang)>2.4&&dist<8)?-1:0.93;
  if(inp.throttle<0)inp.steer=-inp.steer;
  inp.boost=b.grounded&&Math.abs(ang)<0.3&&(dist>16||behind)&&b.boost>8;
  inp.pitch=0;inp.roll=0;
  const bd=Math.hypot(B.x-b.pos.x,B.z-b.pos.z);
  const bang=wrapA(Math.atan2(B.x-b.pos.x,B.z-b.pos.z)-yawNow);
  const facing=Math.abs(bang)<0.35;
  if(b.grounded&&!behind&&facing){
    if(B.y>3.4&&B.y<7&&bd<6.5){inp.jumpPressed=true;b.ai.flipAt=now+0.18;}
    else if(B.y<3.2&&bd<6&&b.vel.length()>12&&Math.random()<0.08){inp.jumpPressed=true;b.ai.flipAt=now+0.08;}
  }
  if(!b.grounded){
    if(b.ai.flipAt&&now>=b.ai.flipAt){inp.pitch=1;inp.steer=clamp(-bang*1.5,-1,1)*0.5;inp.jumpPressed=true;b.ai.flipAt=0;}
    else{inp.pitch=clamp(sF.y*2.5,-1,1);inp.steer=0;inp.boost=false;}
  }
}
