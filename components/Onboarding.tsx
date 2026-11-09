import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft, Check, Search, X, Headphones, Play, Pause, MapPin, BookOpen, Monitor, RotateCcw, Square, EyeOff, Eraser, Image } from 'lucide-react';
import { ICONS, LESSONS, Area } from './tutorial/content';
import narration from './tutorial/narration.json';
import './tutorial/tutorial.css';

interface Props { onComplete: () => void; onLocate?: (area: Area) => void }
const KEY = 'flujo_tutorial_v2_step';
const readStep = () => { try { const n = Number(localStorage.getItem(KEY)); return Number.isInteger(n) && n >= 0 && n < LESSONS.length ? n : 0; } catch { return 0; } };
const normal = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export default function Onboarding({onComplete, onLocate}: Props) {
  const [stepIndex, setStepIndex] = useState(readStep);
  const [mode, setMode] = useState<'guide' | 'icons'>('guide');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [demo, setDemo] = useState({black:false,text:false,background:false,logo:false});
  const dialog = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const step = LESSONS[stepIndex];
  const finish = () => { audio.current?.pause(); localStorage.setItem('oasis_onboarding_complete','true'); localStorage.setItem('flujo_tutorial_v2_seen','true'); onComplete(); };
  useEffect(() => { localStorage.setItem(KEY, String(stepIndex)); setSelected(null); const scroll = dialog.current?.querySelector('.guide-scroll'); if (scroll) scroll.scrollTop = 0; }, [stepIndex]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const narrationAudio = audio.current;
    dialog.current?.focus();
    return () => { narrationAudio?.pause(); if (previous?.isConnected) previous.focus(); };
  }, []);
  useEffect(() => { if (!locating) return;
    const selectors = {control:'#control-panel',playlist:'#playlist-panel',preview:'#live-preview-panel'};
    const measure = () => { const el = document.querySelector(selectors[step.area]); setRect(el?.getBoundingClientRect() ?? null); };
    const observer = new ResizeObserver(measure);
    const el = document.querySelector(selectors[step.area]); if (el) observer.observe(el);
    measure(); window.addEventListener('resize',measure);
    return () => { observer.disconnect(); window.removeEventListener('resize',measure); };
  }, [locating,step.area]);
  const filtered = (mode === 'icons' ? ICONS : ICONS.filter(i => step.icons.includes(i.name))).filter(i => normal(`${i.name} ${i.description} ${i.shortcut ?? ''}`).includes(normal(query)));
  const playAudio = async () => { if (!audio.current) return; if (playing) audio.current.pause(); else { setAudioError(false); try { await audio.current.play(); } catch { setAudioError(true); } } };
  const locate = () => { audio.current?.pause(); onLocate?.(step.area); setLocating(true); };
  return <div className={`guide-layer ${locating ? 'is-locating' : ''}`}>
    {locating && rect && rect.width > 0 && <div className="guide-spotlight" style={{left:rect.left+4,top:rect.top+4,width:rect.width-8,height:rect.height-8}} />}
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="guide-title" tabIndex={-1} className={`guide-dialog ${locating ? 'guide-locator' : ''}`} onKeyDown={e => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); if (locating) setLocating(false); else finish(); }
      if (e.key === 'Tab') {
        const nodes = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, audio[controls], [tabindex="0"]') ?? [])].filter(el => el.getClientRects().length);
        const first = nodes[0], last = nodes[nodes.length-1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }}>
      <header className="guide-top"><div className="guide-brand"><BookOpen size={21}/><span>FLUJOECLESIAL <small>Aprende a tu ritmo</small></span></div><button onClick={finish} title="Saltar tutorial" aria-label="Cerrar tutorial"><X size={20}/><span>Cerrar</span></button></header>
      {locating ? <div className="guide-locate-content"><span className="guide-eyebrow">ESTÁS AQUÍ</span><h2 id="guide-title">{ {control:'Preparar',playlist:'Organizar',preview:'Proyectar'}[step.area] }</h2><p>Esta es el área que estamos explorando. Vuelve a la guía para continuar la práctica.</p><button className="guide-primary" onClick={() => setLocating(false)} autoFocus><ArrowLeft size={16}/> Volver a la guía</button></div> : <>
      <div className="guide-layout">
        <aside className="guide-sidebar"><p className="guide-eyebrow">GUÍA DEL EQUIPO</p><h2>De la preparación<br/>a la proyección.</h2><p className="guide-muted">Un recorrido práctico para tu próximo servicio.</p>
          <nav aria-label="Capítulos del tutorial">{LESSONS.map((lesson,i) => <button key={lesson.title} aria-current={mode === 'guide' && i === stepIndex ? 'step' : undefined} onClick={() => {setMode('guide');setStepIndex(i);setQuery('');}}><span className="guide-number">{String(i+1).padStart(2,'0')}</span><span>{lesson.title}</span>{i === stepIndex && mode==='guide' && <span className="guide-dot"/>}</button>)}</nav>
          <div className="guide-sidebar-note"><Monitor size={17}/><span>La práctica no cambia tu salida en vivo.</span></div>
        </aside>
        <main className="guide-main">
          <div className="guide-tabs" role="group" aria-label="Contenido de la ayuda"><button aria-pressed={mode==='guide'} onClick={() => {setMode('guide');setQuery('');}}>Recorrido guiado</button><button aria-pressed={mode==='icons'} onClick={() => {setMode('icons');setQuery('');setSelected(null);}}>Diccionario de iconos <span>{ICONS.length}</span></button></div>
          <div className="guide-scroll" key={mode}>
            <span className="guide-eyebrow">{mode === 'guide' ? step.eyebrow : 'ENCUENTRA CADA CONTROL'}</span>
            <h1 id="guide-title">{mode === 'guide' ? step.title : '¿Qué hace este icono?'}</h1>
            <p className="guide-intro">{mode === 'guide' ? step.text : 'Busca por nombre, acción o atajo. Toca una tarjeta para conocer su función y dónde encontrarla.'}</p>
            {mode === 'guide' && stepIndex === 0 && <div className="guide-map">{['Preparar','Organizar','Proyectar'].map((name,i)=><button key={name} onClick={()=>setStepIndex([1,3,4][i])}><span>0{i+1}</span><strong>{name}</strong><small>{['Crea tu contenido','Ordena el servicio','Controla la salida'][i]}</small><ArrowRight size={17}/></button>)}</div>}
            {mode === 'icons' && <label className="guide-search"><Search size={18}/><input placeholder="Buscar icono: logo, guardar, pantalla…" aria-label="Buscar iconos" value={query} onChange={e=>setQuery(e.target.value)}/>{query && <button aria-label="Limpiar búsqueda de iconos" onClick={()=>setQuery('')}><X size={16}/></button>}</label>}
            <div className="guide-icons">{filtered.map(item => <button key={item.name} className={selected===item.name?'selected':''} aria-expanded={selected===item.name} onClick={()=>setSelected(selected===item.name?null:item.name)}><span className="guide-icon-box"><item.icon size={21}/></span><span className="guide-icon-text"><strong>{item.name}</strong><small>{ {control:'Preparar',playlist:'Organizar',preview:'Proyectar'}[item.area] }{item.shortcut && ` · ${item.shortcut}`}</small>{selected===item.name && <span className="guide-icon-description">{item.description}</span>}</span><PlusMinus open={selected===item.name}/></button>)}</div>
            {filtered.length === 0 && <p role="status" className="guide-empty">No encontramos ese icono. Prueba «pantalla», «texto» o «guardar».</p>}
            {mode === 'guide' && stepIndex===6 && <section className="guide-practice" aria-label="Simulador de proyección"><div className="guide-practice-heading"><span>SIMULADOR · SOLO PRÁCTICA</span><button onClick={()=>setDemo({black:false,text:false,background:false,logo:false})}><RotateCcw size={14}/> Reiniciar práctica</button></div><div data-testid="tutorial-preview" className={`guide-demo ${demo.black || demo.background ? 'black' : ''}`} aria-label={demo.black?'Pantalla negra de práctica':demo.logo?'Logo de práctica':demo.text?'Solo fondo de práctica':'Texto y fondo de práctica'}>{!demo.black && (demo.logo ? <div className="guide-demo-logo"><BookOpen size={36}/><strong>Tu iglesia</strong></div> : !demo.text && <div><small>BIENVENIDOS</small><strong>Unidos en fe<br/>y comunidad</strong></div>)}</div><div className="guide-demo-controls">{([{key:'black',label:'Negro',icon:Square},{key:'text',label:'Sin texto',icon:EyeOff},{key:'background',label:'Sin fondo',icon:Eraser},{key:'logo',label:'Logo',icon:Image}] as const).map(control=><button key={control.key} aria-pressed={demo[control.key]} onClick={()=>setDemo(prev=>({...prev,[control.key]:!prev[control.key]}))}><control.icon size={16}/>{control.label}</button>)}</div><p role="status">{demo.black?'Negro está activo: toda la salida de práctica queda oculta.':demo.logo?'Logo está activo: se muestra la identidad de tu iglesia.':demo.text?'Sin texto está activo: las palabras quedan ocultas.':demo.background?'Sin fondo está activo: el texto queda sobre negro.':'Texto y fondo visibles. Prueba un control.'}</p></section>}
            {mode === 'guide' && <div className="guide-tip"><span>PARA RECORDAR</span><p>{step.tip}</p><button onClick={locate}><MapPin size={16}/> Ubicar esta sección</button></div>}
          </div>
          <section className="guide-audio" aria-label="Audioguía en español"><div className="guide-audio-row"><button onClick={playAudio} className="guide-audio-play" aria-label={playing?'Pausar narración':'Escuchar narración en español'}>{playing?<Pause size={19}/>:<Play size={19}/>}</button><div><strong><Headphones size={14}/> Audioguía en español</strong><small>Arturo · ElevenLabs · Recorrido completo</small></div><button onClick={()=>{if(audio.current) audio.current.currentTime=0;}} title="Reiniciar narración" aria-label="Reiniciar narración"><RotateCcw size={16}/></button><button onClick={()=>setShowTranscript(!showTranscript)} aria-expanded={showTranscript}>Texto</button></div>
            <audio ref={audio} src={`${import.meta.env.BASE_URL}tutorial/guia-es.mp3`} preload="none" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onError={()=>setAudioError(true)} />
            {audioError && <p role="status">No se pudo reproducir el audio. Puedes seguir la guía escrita o volver a intentarlo.</p>}
            {showTranscript && <div className="guide-transcript" tabIndex={0}>{narration}</div>}
          </section>
          <footer className="guide-footer"><div className="guide-progress" aria-label={`Capítulo ${stepIndex+1} de ${LESSONS.length}`}><span style={{width:`${(stepIndex+1)/LESSONS.length*100}%`}}/></div><div><span className="guide-count">{stepIndex+1} de {LESSONS.length}</span><button disabled={stepIndex===0} onClick={()=>{setMode('guide');setQuery('');setStepIndex(s=>s-1);}}><ArrowLeft size={16}/> Atrás</button><button className="guide-primary" onClick={()=>{if(stepIndex===LESSONS.length-1) finish(); else {setMode('guide');setQuery('');setStepIndex(s=>s+1);}}}>{stepIndex===LESSONS.length-1?'Terminar tutorial':'Siguiente'}{stepIndex===LESSONS.length-1?<Check size={16}/>:<ArrowRight size={16}/>}</button></div></footer>
        </main>
      </div></>}
    </div>
  </div>;
}
function PlusMinus({open}:{open:boolean}) {return <span aria-hidden="true" className="guide-expand">{open?'−':'+'}</span>;}
