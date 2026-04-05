const LATITUD = 15.22553;
const LONGITUD = -90.11064;

const TABLA_VOL_NIVEL = [
  [0.00, 770.00],[2297.00, 770.50],[5167.70, 771.00],[8623.90, 771.50],
  [12769.60, 772.00],[17624.49, 772.50],[23241.57, 773.00],[29304.76, 773.50],
  [35764.33, 774.00],[42637.14, 774.50],[49924.80, 775.00],[57672.94, 775.50],
  [65881.95, 776.00],[74567.19, 776.50],[83801.42, 777.00],[93664.56, 777.50],
  [104784.00, 778.00]
];

const NIVEL_MINIMO_OPERATIVO = 773.50;
const NIVEL_REBALSE = 777.50;
const HORAS_OBLIGATORIAS = [18,19,20,21];
const HORAS_SIMULACION = 24;
const INTERVALO_ACTUALIZACION_MS = 10*60*1000;

const POTENCIA_UNA = 4.2;
const POTENCIA_DOS = 8.2;

const PATRON_ENTRADA_REAL = [
  1.70,1.55,1.55,1.75,1.95,2.10,2.15,2.35,2.25,2.05,2.15,2.05,
  1.70,1.95,1.90,1.95,2.20,2.10,1.55,1.55,1.55,1.70,1.95,2.65
];

const round2 = v => Math.round(v*100)/100;

function limitarVolumen(v){
  return Math.max(TABLA_VOL_NIVEL[0][0],
    Math.min(v, TABLA_VOL_NIVEL[TABLA_VOL_NIVEL.length-1][0]));
}

function nivelAVolumen(n){
  for(let i=0;i<TABLA_VOL_NIVEL.length-1;i++){
    let [v1,h1]=TABLA_VOL_NIVEL[i];
    let [v2,h2]=TABLA_VOL_NIVEL[i+1];
    if(n>=h1&&n<=h2)
      return v1+(n-h1)/(h2-h1)*(v2-v1);
  }
  return TABLA_VOL_NIVEL[0][0];
}

function volumenANivel(v){
  for(let i=0;i<TABLA_VOL_NIVEL.length-1;i++){
    let [v1,h1]=TABLA_VOL_NIVEL[i];
    let [v2,h2]=TABLA_VOL_NIVEL[i+1];
    if(v>=v1&&v<=v2)
      return h1+(v-v1)/(v2-v1)*(h2-h1);
  }
  return TABLA_VOL_NIVEL[0][1];
}

function calcularCaudalSalida(p){ return p/2.69266667; }
function calcularVolumenTurbinado(q){ return q*3600; }

function generarCaudales24h(base,lluvias){
  const prom=PATRON_ENTRADA_REAL.reduce((a,b)=>a+b,0)/24;
  return PATRON_ENTRADA_REAL.map((p,i)=>{
    const f=p/prom;
    return round2(base*f);
  });
}

function evaluar(vol,q,p){
  let vh=q*3600;
  let vs=p>0?calcularVolumenTurbinado(calcularCaudalSalida(p)):0;
  let dif=vh-vs;
  let nuevo=limitarVolumen(vol+dif);
  return {p, vh, vs, dif, vol:nuevo, nivel:volumenANivel(nuevo)};
}

function decidirIA(h,nivel,vol,q,caudales,enProd,modo){
  const esObl=HORAS_OBLIGATORIAS.includes(h);

  const off=evaluar(vol,q,0);
  const u1=evaluar(vol,q,POTENCIA_UNA);
  const u2=evaluar(vol,q,POTENCIA_DOS);

  if(esObl){
    if(u1.nivel>=NIVEL_MINIMO_OPERATIVO) return POTENCIA_UNA;
    return POTENCIA_DOS;
  }

  if(enProd){
    if(modo===2) return POTENCIA_DOS;

    if(nivel>=NIVEL_REBALSE || u1.nivel>=NIVEL_REBALSE){
      return POTENCIA_DOS;
    }

    return POTENCIA_UNA;
  }

  if(nivel>=NIVEL_REBALSE){
    if(u1.nivel>=NIVEL_MINIMO_OPERATIVO) return POTENCIA_UNA;
    return POTENCIA_DOS;
  }

  if(off.nivel>=NIVEL_REBALSE){
    return POTENCIA_UNA;
  }

  return 0;
}

function simularDia(nivelInicial,caudalBase,lluvias){
  let vol=nivelAVolumen(nivelInicial);
  let nivel=nivelInicial;
  let caudales=generarCaudales24h(caudalBase,lluvias);

  let enProd=false;
  let modo=0;

  const resultados=[];

  for(let h=0;h<24;h++){
    let q=caudales[h];

    let decision=decidirIA(h,nivel,vol,q,caudales,enProd,modo);

    if(!enProd){
      if(decision===POTENCIA_UNA){enProd=true;modo=1;}
      if(decision===POTENCIA_DOS){enProd=true;modo=2;}
    }else{
      if(modo===1 && decision===POTENCIA_DOS) modo=2;
    }

    let pot= enProd ? (modo===2?POTENCIA_DOS:POTENCIA_UNA) : 0;

    let r=evaluar(vol,q,pot);

    vol=r.vol;
    nivel=r.nivel;

    resultados.push({
      de:h,
      a:(h+1)%24,
      potencia:pot,
      caudalSalida:r.vs/3600,
      volumenTurbinado:r.vs,
      caudalIngreso:q,
      volumenPorHora:r.vh,
      diferencia:r.dif,
      acumulado:vol,
      nivel:nivel,
      estado: pot===0?"Apagada":
        (modo===1?"1 unidad continua":"2 unidades continua")
    });
  }

  return {resultados};
}

function llenarTabla(res){
  const tbody=document.querySelector("#tablaResultados tbody");
  if(!tbody)return;
  tbody.innerHTML="";
  res.forEach(r=>{
    tbody.innerHTML+=`
    <tr>
    <td>${r.de}:00</td><td>${r.a}:00</td>
    <td>${r.potencia.toFixed(2)}</td>
    <td>${r.caudalSalida.toFixed(2)}</td>
    <td>${r.volumenTurbinado.toFixed(2)}</td>
    <td>${r.caudalIngreso.toFixed(2)}</td>
    <td>${r.volumenPorHora.toFixed(2)}</td>
    <td>${r.diferencia.toFixed(2)}</td>
    <td>${r.acumulado.toFixed(2)}</td>
    <td>${r.nivel.toFixed(2)}</td>
    <td>${r.estado}</td>
    </tr>`;
  });
}

async function obtenerDatosClima(){
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${LATITUD}&longitude=${LONGITUD}&hourly=precipitation`;
  return (await fetch(url)).json();
}

async function calcularManual(){
  const nivel=parseFloat(document.getElementById("nivelInicial").value);
  const caudal=parseFloat(document.getElementById("caudalBase").value);

  const data=await obtenerDatosClima();
  const lluvias=data.hourly.precipitation.slice(0,24);

  const {resultados}=simularDia(nivel,caudal,lluvias);
  llenarTabla(resultados);
}

document.addEventListener("DOMContentLoaded",()=>{
  document.getElementById("btnCalcular")
    .addEventListener("click",calcularManual);
});