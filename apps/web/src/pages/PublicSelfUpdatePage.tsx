import React, { useState, useRef, useCallback } from 'react';
import {
  Search, User, Users, Activity, ChevronRight,
  CheckCircle2, AlertCircle, Loader2, Camera,
  GraduationCap, ArrowLeft, Save, RefreshCw,
  Home, Droplets, Eye, Smile, Scale, Ruler
} from 'lucide-react';
import { API_BASE_URL } from '../lib/api';

interface StudentSummary { id:string; fullName:string; nisn:string; nis:string; className:string; status:string; photoUrl?:string; }
interface ParentData { type:'ayah'|'ibu'|'wali'; name:string; relationship?:string; educationLevel:string; occupation:string; phone:string; }
interface EducationData { previousSchoolName:string; sttbDate:string; sttbNumber:string; transferFromSchool:string; transferFromClass:string; transferAcceptDate:string; }
interface PhysicalEntry { semester:number; academicYear:string; heightCm:string; weightKg:string; hearingCondition:string; visionCondition:string; dentalCondition:string; }
interface StudentForm { nik:string; noKk:string; birthPlace:string; birthDate:string; gender:string; agama:string; kewarganegaraan:string; anakKe:string; jumlahSaudara:string; bahasaSehariHari:string; golonganDarah:string; tempatTinggal:string; jarakSekolahKm:string; address:string; }
type TabId = 'pribadi'|'ortu'|'pendidikan'|'jasmani';

const SEMESTER_COLS = [
  {semester:1,classLevel:'X',label:'Kelas X / Semester 1'},{semester:2,classLevel:'X',label:'Kelas X / Semester 2'},
  {semester:3,classLevel:'XI',label:'Kelas XI / Semester 1'},{semester:4,classLevel:'XI',label:'Kelas XI / Semester 2'},
  {semester:5,classLevel:'XII',label:'Kelas XII / Semester 1'},{semester:6,classLevel:'XII',label:'Kelas XII / Semester 2'},
];
const EMPTY_STUDENT:StudentForm = { nik:'',noKk:'',birthPlace:'',birthDate:'',gender:'',agama:'',kewarganegaraan:'Indonesia',anakKe:'',jumlahSaudara:'',bahasaSehariHari:'',golonganDarah:'',tempatTinggal:'',jarakSekolahKm:'',address:'' };
const EMPTY_PARENTS:ParentData[] = [{type:'ayah',name:'',educationLevel:'',occupation:'',phone:''},{type:'ibu',name:'',educationLevel:'',occupation:'',phone:''},{type:'wali',name:'',relationship:'',educationLevel:'',occupation:'',phone:''}];
const EMPTY_EDU:EducationData = {previousSchoolName:'',sttbDate:'',sttbNumber:'',transferFromSchool:'',transferFromClass:'',transferAcceptDate:''};
const mkPhys = ():PhysicalEntry[] => SEMESTER_COLS.map(c=>({semester:c.semester,academicYear:'',heightCm:'',weightKg:'',hearingCondition:'',visionCondition:'',dentalCondition:''}));
const postApi = async (path:string,body:object) => { const r=await fetch(API_BASE_URL+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Error'); return d; };

const Inp:React.FC<{label:string;value:string;onChange:(v:string)=>void;type?:string;placeholder?:string;hint?:string;span?:boolean}> =
  ({label,value,onChange,type='text',placeholder,hint,span}) => (
    <div className={'fg'+(span?' fg-span':'')}><label className='fl'>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className='fi' />
      {hint&&<span className='fh'>{hint}</span>}</div>);
const Sel:React.FC<{label:string;value:string;onChange:(v:string)=>void;opts:string[];placeholder?:string}> =
  ({label,value,onChange,opts,placeholder}) => (
    <div className='fg'><label className='fl'>{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)} className='fi'>
        {placeholder&&<option value=''>{placeholder}</option>}
        {opts.map(o=><option key={o} value={o}>{o}</option>)}</select></div>);

const CSS_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif}
  .proot{min-height:100vh;background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 45%,#0c4a6e 100%);display:flex;flex-direction:column;align-items:center;padding:1.5rem 1rem 3rem;position:relative;overflow-x:hidden}
  .blob{position:fixed;border-radius:50%;filter:blur(80px);opacity:.15;pointer-events:none;z-index:0}
  .b1{width:400px;height:400px;background:#6366f1;top:-100px;left:-100px;animation:f1 12s ease-in-out infinite}
  .b2{width:320px;height:320px;background:#06b6d4;bottom:-60px;right:-60px;animation:f2 15s ease-in-out infinite}
  @keyframes f1{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,30px)}}
  @keyframes f2{0%,100%{transform:translate(0,0)}50%{transform:translate(-30px,-20px)}}
  .pcontent{position:relative;z-index:1;width:100%;max-width:800px}
  .phdr{text-align:center;margin-bottom:2rem}
  .ring{display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;background:linear-gradient(135deg,#6366f1,#06b6d4);border-radius:50%;margin-bottom:1rem;box-shadow:0 0 30px rgba(99,102,241,.4)}
  .phdr h1{font-size:1.8rem;font-weight:700;background:linear-gradient(135deg,#e0e7ff,#67e8f9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:.35rem}
  .phdr p{color:#94a3b8;font-size:.9rem}
  .card{background:rgba(255,255,255,.06);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:2rem;animation:fu .4s ease}
  @keyframes fu{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  .srow{display:flex;gap:.75rem}
  .sinput{flex:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:.75rem 1rem;color:#e2e8f0;font-size:.95rem;outline:none;transition:border .2s,box-shadow .2s;font-family:'Inter',sans-serif}
  .sinput:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.2)}
  .sinput::placeholder{color:#64748b}
  .btn-p{display:inline-flex;align-items:center;gap:.5rem;padding:.75rem 1.5rem;background:linear-gradient(135deg,#6366f1,#06b6d4);color:#fff;font-weight:600;font-size:.9rem;border:none;border-radius:12px;cursor:pointer;transition:opacity .2s,transform .15s;white-space:nowrap;font-family:'Inter',sans-serif}
  .btn-p:hover:not(:disabled){opacity:.9;transform:translateY(-1px)}
  .btn-p:disabled{opacity:.5;cursor:not-allowed}
  .btn-s{display:inline-flex;align-items:center;gap:.5rem;padding:.75rem 1.5rem;background:rgba(255,255,255,.08);color:#cbd5e1;font-weight:500;font-size:.9rem;border:1px solid rgba(255,255,255,.15);border-radius:12px;cursor:pointer;transition:background .2s;font-family:'Inter',sans-serif}
  .btn-s:hover{background:rgba(255,255,255,.15)}
  .errbox{display:flex;align-items:center;gap:.5rem;padding:.75rem 1rem;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);border-radius:10px;color:#fca5a5;font-size:.875rem;margin-top:1rem}
  .rlist{display:flex;flex-direction:column;gap:.75rem;margin-top:1rem}
  .ritem{display:flex;align-items:center;gap:1rem;padding:1rem 1.25rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;cursor:pointer;transition:background .2s,border-color .2s,transform .15s}
  .ritem:hover{background:rgba(99,102,241,.15);border-color:rgba(99,102,241,.4);transform:translateX(4px)}
  .ravatar{width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,rgba(99,102,241,.4),rgba(6,182,212,.4));display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}
  .ravatar img{width:100%;height:100%;object-fit:cover}
  .rname{color:#e2e8f0;font-weight:600;font-size:.95rem}
  .rmeta{color:#94a3b8;font-size:.8rem;margin-top:.1rem}
  .idcard{background:linear-gradient(135deg,rgba(99,102,241,.2),rgba(6,182,212,.2));border:1px solid rgba(255,255,255,.15);border-radius:16px;padding:1.25rem 1.5rem;display:flex;align-items:center;gap:1.25rem;margin-bottom:1.5rem}
  .idphoto{width:72px;height:96px;border-radius:8px;overflow:hidden;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:2px solid rgba(255,255,255,.2)}
  .idphoto img{width:100%;height:100%;object-fit:cover}
  .idname{color:#e2e8f0;font-weight:700;font-size:1.1rem}
  .idbadges{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.5rem}
  .badge{padding:.2rem .65rem;background:rgba(255,255,255,.1);border-radius:20px;color:#94a3b8;font-size:.75rem}
  .badgeb{background:rgba(99,102,241,.25);color:#a5b4fc}
  .tabbar{display:flex;gap:.375rem;background:rgba(255,255,255,.05);border-radius:14px;padding:.375rem;margin-bottom:1.75rem;overflow-x:auto}
  .tabbtn{display:flex;align-items:center;gap:.4rem;padding:.6rem 1rem;border-radius:10px;border:none;cursor:pointer;font-size:.83rem;font-weight:500;white-space:nowrap;color:#94a3b8;background:transparent;transition:background .2s,color .2s;font-family:'Inter',sans-serif}
  .tabbtn.active{background:linear-gradient(135deg,#6366f1,#06b6d4);color:#fff;box-shadow:0 4px 12px rgba(99,102,241,.35)}
  .tabbtn:hover:not(.active){background:rgba(255,255,255,.08);color:#cbd5e1}
  .stlabel{color:#cbd5e1;font-size:.8rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:1rem;margin-top:1.5rem;padding-bottom:.4rem;border-bottom:1px solid rgba(255,255,255,.08)}
  .stlabel:first-child{margin-top:0}
  .fgrid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  .fgrid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem}
  @media(max-width:600px){.fgrid,.fgrid3{grid-template-columns:1fr}.srow{flex-direction:column}}
  .fg{display:flex;flex-direction:column;gap:.35rem}
  .fg-span{grid-column:1/-1}
  .fl{color:#94a3b8;font-size:.8rem;font-weight:500}
  .fi{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:.65rem .875rem;color:#e2e8f0;font-size:.9rem;outline:none;width:100%;transition:border .2s,box-shadow .2s;font-family:'Inter',sans-serif}
  .fi:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.18)}
  .fi::placeholder{color:#475569}
  .fi option{background:#1e293b}
  textarea.fi{resize:vertical;min-height:80px}
  .fh{color:#64748b;font-size:.73rem}
  .rgrp{display:flex;gap:1rem;align-items:center;padding-top:.4rem}
  .ri{display:flex;align-items:center;gap:.4rem;cursor:pointer;color:#94a3b8;font-size:.875rem}
  .ri input{accent-color:#6366f1;width:16px;height:16px}
  .photoup{display:flex;flex-direction:column;align-items:center;gap:1rem;padding:1.5rem;border:2px dashed rgba(99,102,241,.4);border-radius:14px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;background:rgba(99,102,241,.05)}
  .photoup:hover{border-color:#6366f1;background:rgba(99,102,241,.1)}
  .pprev{width:120px;height:160px;border-radius:8px;object-fit:cover;border:2px solid rgba(99,102,241,.5)}
  .pcard{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:1.25rem;margin-bottom:1rem}
  .ptitle{display:flex;align-items:center;gap:.5rem;color:#a5b4fc;font-weight:600;font-size:.9rem;margin-bottom:1rem}
  .picon{width:28px;height:28px;border-radius:8px;background:rgba(99,102,241,.25);display:flex;align-items:center;justify-content:center}
  .physcard{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:1.25rem;margin-bottom:.75rem}
  .physlabel{color:#67e3f9;font-size:.8rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.75rem;display:flex;align-items:center;gap:.4rem}
  .factions{display:flex;gap:.75rem;justify-content:flex-end;padding-top:1.5rem;border-top:1px solid rgba(255,255,255,.08);margin-top:1.5rem;flex-wrap:wrap}
  .sucicon{width:88px;height:88px;background:linear-gradient(135deg,#10b981,#06b6d4);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;box-shadow:0 0 30px rgba(16,185,129,.4);animation:si .4s cubic-bezier(.175,.885,.32,1.275)}
  @keyframes si{from{transform:scale(0)}to{transform:scale(1)}}
  .suctitle{color:#e2e8f0;font-size:1.5rem;font-weight:700;text-align:center;margin-bottom:.5rem}
  .sucsub{color:#94a3b8;text-align:center;font-size:.9rem}
  .spin{animation:sp 1s linear infinite}
  @keyframes sp{to{transform:rotate(360deg)}}
  .backlink{display:flex;align-items:center;gap:.4rem;color:#94a3b8;font-size:.85rem;cursor:pointer;margin-bottom:1.5rem;background:none;border:none;font-family:'Inter',sans-serif}
  .backlink:hover{color:#e2e8f0}
  .ftxt{color:#334155;font-size:.75rem;text-align:center;margin-top:2rem}
  .sibig{display:flex;align-items:center;justify-content:center;width:72px;height:72px;background:linear-gradient(135deg,rgba(99,102,241,.3),rgba(6,182,212,.3));border-radius:50%;margin:0 auto 1.5rem;border:1px solid rgba(255,255,255,.15)}
  .stitle{color:#e2e8f0;font-size:1.3rem;font-weight:700;text-align:center;margin-bottom:.4rem}
  .ssub{color:#94a3b8;font-size:.875rem;text-align:center;margin-bottom:1.5rem}
`;

export const PublicSelfUpdatePage:React.FC = () => {
  const [stage,setStage]=useState<'search'|'select'|'form'|'success'>('search');
  const [activeTab,setActiveTab]=useState<TabId>('pribadi');
  const [searchName,setSearchName]=useState('');
  const [searchResults,setSearchResults]=useState<StudentSummary[]>([]);
  const [searchLoading,setSearchLoading]=useState(false);
  const [searchError,setSearchError]=useState('');
  const [selected,setSelected]=useState<StudentSummary|null>(null);
  const [loadingData,setLoadingData]=useState(false);
  const [form,setForm]=useState<StudentForm>(EMPTY_STUDENT);
  const [parents,setParents]=useState<ParentData[]>(EMPTY_PARENTS);
  const [education,setEducation]=useState<EducationData>(EMPTY_EDU);
  const [physical,setPhysical]=useState<PhysicalEntry[]>(mkPhys());
  const [photoUrl,setPhotoUrl]=useState('');
  const [photoPreview,setPhotoPreview]=useState('');
  const [photoFile,setPhotoFile]=useState<File|null>(null);
  const [photoUploading,setPhotoUploading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState('');
  const photoRef=useRef<HTMLInputElement>(null);
  const SERVER_BASE=API_BASE_URL.replace(/\/api$/,'');
  const fullUrl=(u:string)=>u?.startsWith('/')?SERVER_BASE+u:u;

  const doSearch=async()=>{
    if(searchName.trim().length<2){setSearchError('Masukkan minimal 2 karakter.');return;}
    setSearchError('');setSearchLoading(true);
    try{const r=await postApi('/students/self-update/search',{name:searchName.trim()});setSearchResults(r);
      if(r.length===0)setSearchError('Tidak ditemukan. Coba kata kunci lain.');else setStage('select');
    }catch(e:any){setSearchError(e.message);}finally{setSearchLoading(false);}
  };

  const doSelect=async(s:StudentSummary)=>{
    setSelected(s);setLoadingData(true);
    try{
      const d=await postApi('/students/self-update/get-data',{studentId:s.id});
      setForm({nik:d.nik||'',noKk:d.noKk||'',birthPlace:d.birthPlace||'',
        birthDate:d.birthDate?d.birthDate.substring(0,10):'',gender:d.gender||'',agama:d.agama||'',
        kewarganegaraan:d.kewarganegaraan||'Indonesia',anakKe:d.anakKe?.toString()||'',
        jumlahSaudara:d.jumlahSaudara?.toString()||'',bahasaSehariHari:d.bahasaSehariHari||'',
        golonganDarah:d.golonganDarah||'',tempatTinggal:d.tempatTinggal||'',
        jarakSekolahKm:d.jarakSekolahKm||'',address:d.address||''});
      setPhotoUrl(d.photoUrl||'');
      setParents(EMPTY_PARENTS.map(sk=>{const ex=(d.parents||[]).find((p:any)=>p.type===sk.type);
        return ex?{type:sk.type,name:ex.name||'',relationship:ex.relationship||'',
          educationLevel:ex.educationLevel||'',occupation:ex.occupation||'',phone:ex.phone||''}:{...sk};}) as ParentData[]);
      const edu=d.education?.[0]||{};
      setEducation({previousSchoolName:edu.previousSchoolName||'',sttbDate:edu.sttbDate?edu.sttbDate.substring(0,10):'',
        sttbNumber:edu.sttbNumber||'',transferFromSchool:edu.transferFromSchool||'',
        transferFromClass:edu.transferFromClass||'',transferAcceptDate:edu.transferAcceptDate?edu.transferAcceptDate.substring(0,10):''});
      const exPhy:any[]=d.physical||[];
      setPhysical(SEMESTER_COLS.map(col=>{const ex=exPhy.find((p:any)=>p.semester===col.semester);
        return ex?{semester:ex.semester,academicYear:ex.academicYear||'',heightCm:ex.heightCm?.toString()||'',
          weightKg:ex.weightKg?.toString()||'',hearingCondition:ex.hearingCondition||'',
          visionCondition:ex.visionCondition||'',dentalCondition:ex.dentalCondition||''}:{...mkPhys()[col.semester-1]};}));
      setStage('form');
    }catch(e:any){setSearchError(e.message);setStage('select');}finally{setLoadingData(false);}
  };

  const onPhotoChange=useCallback((e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0];if(!f)return;setPhotoFile(f);
    const r=new FileReader();r.onload=()=>setPhotoPreview(r.result as string);r.readAsDataURL(f);
  },[]);

  const uploadPhoto=async()=>{
    if(!photoFile||!selected)return null;setPhotoUploading(true);
    try{const fd=new FormData();fd.append('photo',photoFile);fd.append('studentId',selected.id);
      const res=await fetch(API_BASE_URL+'/students/self-update/upload-photo',{method:'POST',body:fd});
      const data=await res.json();if(!res.ok)throw new Error(data.error||'Gagal upload foto');return data.photoUrl;
    }finally{setPhotoUploading(false);}
  };

  const doSave=async()=>{
    if(!selected)return;
    setSaveError('');
    // ── Validasi wajib isi ──
    const errors:string[]=[];
    if(!form.nik.trim()) errors.push('NIK wajib diisi');
    if(!form.birthPlace.trim()) errors.push('Tempat Lahir wajib diisi');
    if(!form.birthDate) errors.push('Tanggal Lahir wajib diisi');
    if(!form.gender) errors.push('Jenis Kelamin wajib dipilih');
    if(!form.agama) errors.push('Agama wajib dipilih');
    if(!form.address.trim()) errors.push('Alamat wajib diisi');
    if(errors.length>0){setSaveError('Data Pribadi belum lengkap: '+errors.join(', '));setActiveTab('pribadi');return;}
    const hasParent=parents.some(p=>p.name.trim()!=='');
    if(!hasParent){setSaveError('Minimal isi nama salah satu orang tua (Ayah/Ibu/Wali).');setActiveTab('ortu');return;}
    // ── Simpan ──
    setSaving(true);
    try{
      if(photoFile){const u=await uploadPhoto();if(u)setPhotoUrl(u);}
      await postApi('/students/self-update/save',{studentId:selected.id,
        student:{...form,anakKe:form.anakKe?parseInt(form.anakKe):null,jumlahSaudara:form.jumlahSaudara?parseInt(form.jumlahSaudara):null},
        parents,education:[{...education}],
        physical:physical.map(p=>({...p,heightCm:p.heightCm?parseInt(p.heightCm):null,weightKg:p.weightKg?parseInt(p.weightKg):null}))
          .filter(p=>p.heightCm||p.weightKg||p.hearingCondition||p.visionCondition||p.dentalCondition)});
      setStage('success');
    }catch(e:any){setSaveError(e.message);}finally{setSaving(false);}
  };

  const updP=(i:number,k:keyof ParentData,v:string)=>setParents(ps=>ps.map((p,idx)=>idx===i?{...p,[k]:v}:p));
  const updPh=(i:number,k:keyof PhysicalEntry,v:string)=>setPhysical(ps=>ps.map((p,idx)=>idx===i?{...p,[k]:v}:p));
  const tabs=[{id:'pribadi',icon:<User size={14}/>,label:'Data Pribadi'},{id:'ortu',icon:<Users size={14}/>,label:'Orang Tua'},
    {id:'pendidikan',icon:<GraduationCap size={14}/>,label:'Pendidikan'},{id:'jasmani',icon:<Activity size={14}/>,label:'Jasmani'}] as {id:TabId;icon:React.ReactNode;label:string}[];
  const pTitles=['Ayah','Ibu','Wali'];

  return (
    <>
      <style>{CSS_STYLES}</style>
      <div className='proot'>
        <div className='blob b1'/><div className='blob b2'/>
        <div className='pcontent'>
          <div className='phdr'>
            <div className='ring'><User size={28} color='#fff'/></div>
            <h1>Update Data Diri Siswa</h1>
            <p>Lengkapi data Anda untuk keperluan administrasi sekolah</p>
          </div>

          {stage==='search'&&(
            <div className='card'>
              <div className='sibig'><Search size={32} color='#a5b4fc'/></div>
              <h2 className='stitle'>Cari Data Saya</h2>
              <p className='ssub'>Ketik nama lengkap Anda untuk memulai</p>
              <div className='srow'>
                <input className='sinput' placeholder='Contoh: Ahmad Fauzi' value={searchName}
                  onChange={e=>setSearchName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()}/>
                <button className='btn-p' onClick={doSearch} disabled={searchLoading}>
                  {searchLoading?<Loader2 size={18} className='spin'/>:<Search size={18}/>}
                  {searchLoading?'Mencari...':'Cari'}
                </button>
              </div>
              {searchError&&<div className='errbox'><AlertCircle size={16}/>{searchError}</div>}
              <p style={{color:'#475569',fontSize:'.78rem',marginTop:'1.25rem',textAlign:'center'}}>
                Jika nama tidak ditemukan, hubungi operator sekolah.
              </p>
            </div>
          )}

          {stage==='select'&&(
            <div className='card'>
              <button className='backlink' onClick={()=>setStage('search')}><ArrowLeft size={15}/> Cari nama lain</button>
              <p style={{color:'#94a3b8',fontSize:'.85rem',marginBottom:'.5rem'}}>
                Ditemukan <strong style={{color:'#e2e8f0'}}>{searchResults.length}</strong> data. Pilih nama Anda:
              </p>
              {loadingData
                ?<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'1rem',padding:'3rem',color:'#94a3b8'}}>
                    <Loader2 size={36} className='spin' color='#6366f1'/><span>Memuat data...</span>
                  </div>
                :<div className='rlist'>
                  {searchResults.map(s=>(
                    <div key={s.id} className='ritem' onClick={()=>doSelect(s)}>
                      <div className='ravatar'>
                        {s.photoUrl?<img src={fullUrl(s.photoUrl)} alt={s.fullName}/>:<User size={20} color='#94a3b8'/>}
                      </div>
                      <div>
                        <div className='rname'>{s.fullName}</div>
                        <div className='rmeta'>{s.nis?'NIS: '+s.nis:s.nisn&&!s.nisn.startsWith('TEMP')?'NISN: '+s.nisn:'—'}{s.className?' | '+s.className:''}</div>
                      </div>
                      <ChevronRight size={18} style={{marginLeft:'auto',color:'#64748b'}}/>
                    </div>
                  ))}
                </div>
              }
              {searchError&&<div className='errbox' style={{marginTop:'1rem'}}><AlertCircle size={16}/>{searchError}</div>}
            </div>
          )}

          {stage==='form'&&selected&&(
            <div>
              <div className='idcard'>
                <div className='idphoto'>
                  {(photoPreview||photoUrl)?<img src={photoPreview||fullUrl(photoUrl)} alt='foto'/>:<User size={28} color='#94a3b8'/>}
                </div>
                <div>
                  <div className='idname'>{selected.fullName}</div>
                  <div className='idbadges'>
                    {selected.nis&&<span className='badge badgeb'>NIS: {selected.nis}</span>}
                    {selected.nisn&&!selected.nisn.startsWith('TEMP')&&<span className='badge'>NISN: {selected.nisn}</span>}
                    {selected.className&&<span className='badge'>{selected.className}</span>}
                  </div>
                </div>
              </div>
              <div className='card'>
                <div className='tabbar'>
                  {tabs.map(t=><button key={t.id} className={'tabbtn'+(activeTab===t.id?' active':'')} onClick={()=>setActiveTab(t.id)}>{t.icon}{t.label}</button>)}
                </div>

                {activeTab==='pribadi'&&(
                  <div>
                    {!photoUrl?(
                      <>
                        <p className='stlabel' style={{marginTop:0}}>Foto 3x4</p>
                        <div className='photoup' onClick={()=>photoRef.current?.click()}>
                          {photoPreview?<img src={photoPreview} className='pprev' alt='preview'/>:<Camera size={36} color='#6366f1'/>}
                          <p style={{color:'#94a3b8',fontSize:'.85rem'}}>{photoPreview?'Klik untuk ganti foto':'Klik untuk upload foto 3x4'}</p>
                          <p style={{color:'#64748b',fontSize:'.75rem'}}>JPG, PNG, WebP - Maks 5 MB</p>
                          <input ref={photoRef} type='file' accept='image/jpeg,image/png,image/webp' style={{display:'none'}} onChange={onPhotoChange}/>
                        </div>
                      </>
                    ):(
                      <>
                        <p className='stlabel' style={{marginTop:0}}>Foto Profil</p>
                        <div style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'.5rem'}}>
                          <img src={photoPreview||fullUrl(photoUrl)} className='pprev' alt='foto'/>
                          <div>
                            <p style={{color:'#94a3b8',fontSize:'.85rem',marginBottom:'.5rem'}}>Foto sudah tersimpan.</p>
                            <button className='btn-s' style={{fontSize:'.8rem',padding:'.45rem .9rem'}}
                              onClick={()=>{setPhotoUrl('');setPhotoPreview('');setPhotoFile(null);}}>Ganti Foto</button>
                          </div>
                        </div>
                      </>
                    )}
                    <p className='stlabel'>Identitas Pokok</p>
                    <div className='fgrid'>
                      <Inp label='NIK' value={form.nik} onChange={v=>setForm(f=>({...f,nik:v}))} placeholder='16 digit NIK' hint='Nomor Induk Kependudukan'/>
                      <Inp label='No. KK' value={form.noKk} onChange={v=>setForm(f=>({...f,noKk:v}))} placeholder='16 digit No KK'/>
                      <Inp label='Tempat Lahir' value={form.birthPlace} onChange={v=>setForm(f=>({...f,birthPlace:v}))} placeholder='Kota/Kabupaten'/>
                      <Inp label='Tanggal Lahir' type='date' value={form.birthDate} onChange={v=>setForm(f=>({...f,birthDate:v}))}/>
                    </div>
                    <div className='fgrid' style={{marginTop:'1rem'}}>
                      <div className='fg'>
                        <label className='fl'>Jenis Kelamin</label>
                        <div className='rgrp'>
                          <label className='ri'><input type='radio' name='gender' value='Laki-laki' checked={form.gender==='Laki-laki'} onChange={()=>setForm(f=>({...f,gender:'Laki-laki'}))}/>Laki-laki</label>
                          <label className='ri'><input type='radio' name='gender' value='Perempuan' checked={form.gender==='Perempuan'} onChange={()=>setForm(f=>({...f,gender:'Perempuan'}))}/>Perempuan</label>
                        </div>
                      </div>
                      <Sel label='Agama' value={form.agama} onChange={v=>setForm(f=>({...f,agama:v}))} opts={['Islam','Kristen Protestan','Kristen Katolik','Hindu','Buddha','Konghucu']} placeholder='-- Pilih --'/>
                    </div>
                    <p className='stlabel'>Data Tambahan dan Alamat</p>
                    <div className='fgrid'>
                      <Sel label='Kewarganegaraan' value={form.kewarganegaraan} onChange={v=>setForm(f=>({...f,kewarganegaraan:v}))} opts={['Indonesia','WNA']}/>
                      <Inp label='Bahasa Sehari-hari' value={form.bahasaSehariHari} onChange={v=>setForm(f=>({...f,bahasaSehariHari:v}))} placeholder='Contoh: Bahasa Indonesia'/>
                      <Inp label='Anak Ke-' type='number' value={form.anakKe} onChange={v=>setForm(f=>({...f,anakKe:v}))} placeholder='1'/>
                      <Inp label='Jumlah Saudara' type='number' value={form.jumlahSaudara} onChange={v=>setForm(f=>({...f,jumlahSaudara:v}))} placeholder='0'/>
                      <Sel label='Golongan Darah' value={form.golonganDarah} onChange={v=>setForm(f=>({...f,golonganDarah:v}))} opts={['A','B','AB','O','Tidak Tahu']} placeholder='-- Pilih --'/>
                      <Sel label='Tempat Tinggal' value={form.tempatTinggal} onChange={v=>setForm(f=>({...f,tempatTinggal:v}))} opts={['Bersama Orang Tua','Kos/Kontrakan','Asrama','Pesantren']} placeholder='-- Pilih --'/>
                      <Inp label='Jarak ke Sekolah (km)' value={form.jarakSekolahKm} onChange={v=>setForm(f=>({...f,jarakSekolahKm:v}))} placeholder='Contoh: 3.5'/>
                    </div>
                    <div className='fg' style={{marginTop:'1rem'}}>
                      <label className='fl'>Alamat Lengkap</label>
                      <textarea className='fi' value={form.address}
                        onChange={e=>setForm(f=>({...f,address:e.target.value}))}
                        placeholder='Jl. Contoh No. 1, RT/RW, Desa/Kel., Kec., Kab./Kota' rows={3}/>
                    </div>
                  </div>
                )}

                {activeTab==='ortu'&&(
                  <div>
                    {parents.map((p,i)=>(
                      <div key={p.type} className='pcard'>
                        <div className='ptitle'><div className='picon'><User size={14} color='#a5b4fc'/></div>Data {pTitles[i]}</div>
                        <div className='fgrid'>
                          <div className='fg fg-span'>
                            <label className='fl'>Nama {pTitles[i]}</label>
                            <input type='text' className='fi' value={p.name} onChange={e=>updP(i,'name',e.target.value)} placeholder={'Nama lengkap '+pTitles[i].toLowerCase()}/>
                          </div>
                          {p.type==='wali'&&<div className='fg fg-span'>
                            <label className='fl'>Hubungan dengan Siswa</label>
                            <input type='text' className='fi' value={p.relationship||''} onChange={e=>updP(i,'relationship',e.target.value)} placeholder='Contoh: Paman, Bibi, Kakak'/>
                          </div>}
                          <Sel label='Pendidikan Terakhir' value={p.educationLevel} onChange={v=>updP(i,'educationLevel',v)} opts={['SD/MI','SMP/MTs','SMA/MA/SMK','D1/D2/D3','S1','S2','S3']} placeholder='-- Pilih --'/>
                          <Inp label='Pekerjaan' value={p.occupation} onChange={v=>updP(i,'occupation',v)} placeholder='Contoh: Petani, PNS, Wiraswasta'/>
                          <Inp label='No. Telepon / WhatsApp' value={p.phone} onChange={v=>updP(i,'phone',v)} placeholder='08xxxxxxxxxx'/>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab==='pendidikan'&&(
                  <div>
                    <p className='stlabel' style={{marginTop:0}}>Sekolah Asal SD/MI</p>
                    <div className='fgrid'>
                      <div className='fg fg-span'>
                        <label className='fl'>Nama Sekolah Asal</label>
                        <input type='text' className='fi' value={education.previousSchoolName}
                          onChange={e=>setEducation(ed=>({...ed,previousSchoolName:e.target.value}))} placeholder='Nama SD/MI asal'/>
                      </div>
                      <Inp label='Tanggal STTB/Ijazah' type='date' value={education.sttbDate} onChange={v=>setEducation(ed=>({...ed,sttbDate:v}))}/>
                      <Inp label='Nomor STTB/Ijazah' value={education.sttbNumber} onChange={v=>setEducation(ed=>({...ed,sttbNumber:v}))} placeholder='Nomor ijazah/STTB'/>
                    </div>
                    <p className='stlabel'>Data Pindahan (isi jika pindah dari sekolah lain)</p>
                    <div className='fgrid'>
                      <div className='fg fg-span'>
                        <label className='fl'>Pindahan dari Sekolah</label>
                        <input type='text' className='fi' value={education.transferFromSchool}
                          onChange={e=>setEducation(ed=>({...ed,transferFromSchool:e.target.value}))} placeholder='Nama sekolah asal (jika pindah)'/>
                      </div>
                      <Inp label='Dari Kelas' value={education.transferFromClass} onChange={v=>setEducation(ed=>({...ed,transferFromClass:v}))} placeholder='Contoh: X IPA 2'/>
                      <Inp label='Tanggal Diterima' type='date' value={education.transferAcceptDate} onChange={v=>setEducation(ed=>({...ed,transferAcceptDate:v}))}/>
                    </div>
                  </div>
                )}

                {activeTab==='jasmani'&&(
                  <div>
                    <p style={{color:'#94a3b8',fontSize:'.85rem',marginBottom:'1.25rem'}}>
                      Isi data jasmani per semester. Kosongkan semester yang belum ada data.
                    </p>
                    {physical.map((p,i)=>(
                      <div key={p.semester} className='physcard'>
                        <div className='physlabel'><Activity size={13}/>{SEMESTER_COLS[i].label}</div>
                        <div className='fgrid' style={{marginBottom:'.75rem'}}>
                          <Inp label='Tahun Ajaran' value={p.academicYear} onChange={v=>updPh(i,'academicYear',v)} placeholder='Contoh: 2024/2025'/>
                        </div>
                        <div className='fgrid3'>
                          <div className='fg'>
                            <label className='fl'><Ruler size={11} style={{display:'inline',verticalAlign:'middle',marginRight:'3px'}}/>Tinggi Badan (cm)</label>
                            <input type='number' className='fi' value={p.heightCm} onChange={e=>updPh(i,'heightCm',e.target.value)} placeholder='cm'/>
                          </div>
                          <div className='fg'>
                            <label className='fl'><Scale size={11} style={{display:'inline',verticalAlign:'middle',marginRight:'3px'}}/>Berat Badan (kg)</label>
                            <input type='number' className='fi' value={p.weightKg} onChange={e=>updPh(i,'weightKg',e.target.value)} placeholder='kg'/>
                          </div>
                          <div className='fg'>
                            <label className='fl'><Droplets size={11} style={{display:'inline',verticalAlign:'middle',marginRight:'3px'}}/>Pendengaran</label>
                            <select className='fi' value={p.hearingCondition} onChange={e=>updPh(i,'hearingCondition',e.target.value)}>
                              <option value=''>-- Pilih --</option><option>Normal</option><option>Kurang Baik</option><option>Terganggu</option>
                            </select>
                          </div>
                          <div className='fg'>
                            <label className='fl'><Eye size={11} style={{display:'inline',verticalAlign:'middle',marginRight:'3px'}}/>Penglihatan</label>
                            <select className='fi' value={p.visionCondition} onChange={e=>updPh(i,'visionCondition',e.target.value)}>
                              <option value=''>-- Pilih --</option><option>Normal</option><option>Minus</option><option>Plus</option><option>Silinder</option><option>Terganggu</option>
                            </select>
                          </div>
                          <div className='fg'>
                            <label className='fl'><Smile size={11} style={{display:'inline',verticalAlign:'middle',marginRight:'3px'}}/>Kondisi Gigi</label>
                            <select className='fi' value={p.dentalCondition} onChange={e=>updPh(i,'dentalCondition',e.target.value)}>
                              <option value=''>-- Pilih --</option><option>Baik</option><option>Berlubang</option><option>Perlu Perawatan</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {saveError&&<div className='errbox' style={{marginTop:'1rem'}}><AlertCircle size={16}/>{saveError}</div>}
                <div className='factions'>
                  <button className='btn-s' onClick={()=>{setStage('select');setSaveError('');}}><ArrowLeft size={16}/> Ganti Siswa</button>
                  <button className='btn-p' onClick={doSave} disabled={saving||photoUploading}>
                    {(saving||photoUploading)?<Loader2 size={16} className='spin'/>:<Save size={16}/>}
                    {saving?'Menyimpan...':photoUploading?'Upload foto...':'Simpan Data'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {stage==='success'&&(
            <div className='card' style={{textAlign:'center',padding:'3rem 2rem'}}>
              <div className='sucicon'><CheckCircle2 size={44} color='#fff'/></div>
              <h2 className='suctitle'>Data Berhasil Disimpan!</h2>
              <p className='sucsub'>Data {selected?.fullName} telah berhasil diperbarui.<br/>Terima kasih telah melengkapi informasi Anda.</p>
              <div style={{display:'flex',gap:'.75rem',justifyContent:'center',marginTop:'2rem',flexWrap:'wrap'}}>
                <button className='btn-s' onClick={()=>{setStage('form');setSaveError('');setPhotoFile(null);setPhotoPreview('');}}><RefreshCw size={16}/> Update Lagi</button>
                <button className='btn-p' onClick={()=>{setStage('search');setSearchName('');setSearchResults([]);setSelected(null);setSearchError('');}}><Home size={16}/> Kembali ke Awal</button>
              </div>
            </div>
          )}

          <p className='ftxt'>Copyright {new Date().getFullYear()} Sistem Informasi Madrasah - MAN 2 Lombok Timur</p>
        </div>
      </div>
    </>
  );
};

export default PublicSelfUpdatePage;
