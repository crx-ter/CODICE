const CodePlayground = (() => {

  const LANGUAGES = [
    {id:'html',label:'HTML/CSS/JS',group:'Web'},{id:'js',label:'JavaScript',group:'Web'},
    {id:'typescript',label:'TypeScript',group:'Web'},{id:'css',label:'CSS',group:'Web'},
    {id:'react',label:'React / JSX',group:'Web'},{id:'vue',label:'Vue',group:'Web'},
    {id:'python',label:'Python',group:'Backend'},{id:'java',label:'Java',group:'Backend'},
    {id:'cpp',label:'C++',group:'Backend'},{id:'c',label:'C',group:'Backend'},
    {id:'csharp',label:'C#',group:'Backend'},{id:'php',label:'PHP',group:'Backend'},
    {id:'ruby',label:'Ruby',group:'Backend'},{id:'go',label:'Go',group:'Backend'},
    {id:'rust',label:'Rust',group:'Backend'},{id:'kotlin',label:'Kotlin',group:'Mobile'},
    {id:'swift',label:'Swift',group:'Mobile'},{id:'dart',label:'Dart',group:'Mobile'},
    {id:'luau',label:'Luau (Roblox)',group:'Game'},{id:'lua',label:'Lua 5.4',group:'Game'},
    {id:'gdscript',label:'GDScript (Godot)',group:'Game'},
    {id:'bash',label:'Bash/Shell',group:'Scripting'},{id:'sql',label:'SQL',group:'Data'},
    {id:'r',label:'R',group:'Data'},{id:'sass',label:'SASS/SCSS',group:'Web'},
  ];

  const LANG_COLORS = {
    html:'#e44d26',js:'#f7df1e',css:'#264de4',python:'#3776ab',java:'#ed8b00',
    cpp:'#00599c',csharp:'#239120',php:'#777bb4',luau:'#00b2ff',lua:'#000080',
    gdscript:'#478cbf',go:'#00add8',rust:'#dea584',kotlin:'#7f52ff',swift:'#f05138',
    sql:'#336791',typescript:'#3178c6',react:'#61dafb',ruby:'#cc342d',dart:'#0175c2',
    bash:'#4eaa25',r:'#276dc3',vue:'#4fc08d',sass:'#cd6799',
  };

  // ── Syntax highlighter — COMPLETE keyword + builtin sets ──
  const KW = {
    js: ['abstract','arguments','await','boolean','break','byte','case','catch','char','class','const','continue','debugger','default','delete','do','double','else','enum','eval','export','extends','false','final','finally','float','for','function','goto','if','implements','import','in','instanceof','int','interface','let','long','native','new','null','of','package','private','protected','public','return','short','static','super','switch','synchronized','this','throw','throws','transient','true','try','typeof','undefined','var','void','volatile','while','with','yield','from','async'],
    ts: ['abstract','any','as','asserts','async','await','bigint','boolean','break','case','catch','class','const','constructor','continue','debugger','declare','default','delete','do','else','enum','export','extends','false','finally','for','from','function','get','if','implements','import','in','infer','instanceof','interface','is','keyof','let','module','namespace','never','new','null','number','object','of','override','package','private','protected','public','readonly','return','require','set','static','string','super','switch','symbol','this','throw','true','try','type','typeof','undefined','unique','unknown','var','void','while','with','yield'],
    python: ['and','as','assert','async','await','break','class','continue','def','del','elif','else','except','exec','finally','for','from','global','if','import','in','is','lambda','nonlocal','not','or','pass','print','raise','return','try','while','with','yield','None','True','False','self','cls'],
    java: ['abstract','assert','boolean','break','byte','case','catch','char','class','const','continue','default','do','double','else','enum','extends','false','final','finally','float','for','goto','if','implements','import','instanceof','int','interface','long','native','new','null','package','private','protected','public','return','short','static','strictfp','super','switch','synchronized','this','throw','throws','transient','true','try','var','void','volatile','while','String'],
    cpp: ['alignas','alignof','and','and_eq','asm','atomic_cancel','atomic_commit','atomic_noexcept','auto','bitand','bitor','bool','break','case','catch','char','char8_t','char16_t','char32_t','class','compl','concept','const','consteval','constexpr','constinit','const_cast','continue','co_await','co_return','co_yield','decltype','default','delete','do','double','dynamic_cast','else','enum','explicit','export','extern','false','float','for','friend','goto','if','inline','int','long','mutable','namespace','new','noexcept','not','not_eq','nullptr','operator','or','or_eq','private','protected','public','register','reinterpret_cast','requires','return','short','signed','sizeof','static','static_assert','static_cast','struct','switch','template','this','thread_local','throw','true','try','typedef','typeid','typename','union','unsigned','using','virtual','void','volatile','wchar_t','while','xor','xor_eq','override','final','include','define','ifdef','ifndef','endif','pragma'],
    c: ['auto','break','case','char','const','continue','default','do','double','else','enum','extern','float','for','goto','if','inline','int','long','register','restrict','return','short','signed','sizeof','static','struct','switch','typedef','union','unsigned','void','volatile','while','NULL','true','false','include','define','ifdef','ifndef','endif','pragma'],
    csharp: ['abstract','as','base','bool','break','byte','case','catch','char','checked','class','const','continue','decimal','default','delegate','do','double','else','enum','event','explicit','extern','false','finally','fixed','float','for','foreach','goto','if','implicit','in','int','interface','internal','is','lock','long','namespace','new','null','object','operator','out','override','params','private','protected','public','readonly','ref','return','sbyte','sealed','short','sizeof','stackalloc','static','string','struct','switch','this','throw','true','try','typeof','uint','ulong','unchecked','unsafe','ushort','using','virtual','void','volatile','while','async','await','dynamic','var','record','init','nint','nuint','with'],
    luau: ['and','break','continue','do','else','elseif','end','export','false','for','function','if','in','local','nil','not','or','repeat','return','then','true','type','until','while'],
    lua: ['and','break','do','else','elseif','end','false','for','function','goto','if','in','local','nil','not','or','repeat','return','then','true','until','while'],
    gdscript: ['and','as','assert','break','breakpoint','class','class_name','const','continue','elif','else','enum','export','extends','false','for','func','if','in','is','master','match','null','onready','or','pass','puppet','remote','remotesync','return','self','setget','signal','slave','static','tool','true','var','while','yield','not','preload','load','null'],
    php: ['__halt_compiler','abstract','and','array','as','break','callable','case','catch','class','clone','const','continue','declare','default','die','do','echo','else','elseif','empty','enddeclare','endfor','endforeach','endif','endswitch','endwhile','eval','exit','extends','final','finally','fn','for','foreach','function','global','goto','if','implements','include','include_once','instanceof','insteadof','interface','isset','list','match','namespace','new','or','print','private','protected','public','require','require_once','return','static','switch','throw','trait','try','unset','use','var','while','xor','yield','null','true','false','self','parent'],
    ruby: ['__ENCODING__','__LINE__','__FILE__','BEGIN','END','alias','and','begin','break','case','class','def','defined?','do','else','elsif','end','ensure','false','for','if','in','module','next','nil','not','or','redo','rescue','retry','return','self','super','then','true','undef','unless','until','when','while','yield'],
    go: ['break','case','chan','const','continue','default','defer','else','fallthrough','for','func','go','goto','if','import','interface','map','package','range','return','select','struct','switch','type','var','true','false','nil','iota','append','cap','close','complex','copy','delete','imag','len','make','new','panic','print','println','real','recover'],
    rust: ['as','async','await','break','const','continue','crate','dyn','else','enum','extern','false','fn','for','if','impl','in','let','loop','match','mod','move','mut','pub','ref','return','self','Self','static','struct','super','trait','true','type','union','unsafe','use','where','while','abstract','become','box','do','final','macro','override','priv','try','typeof','unsized','virtual','yield'],
    kotlin: ['as','break','class','continue','do','else','false','for','fun','if','in','interface','is','null','object','package','return','super','this','throw','true','try','typealias','typeof','val','var','when','while','abstract','actual','annotation','companion','constructor','crossinline','data','enum','expect','external','final','infix','init','inline','inner','internal','lateinit','noinline','open','operator','out','override','private','protected','public','reified','sealed','suspend','tailrec','vararg','by','catch','delegate','dynamic','field','file','finally','get','import','param','property','receiver','set','setparam','where'],
    swift: ['associatedtype','class','deinit','enum','extension','fileprivate','func','import','init','inout','internal','let','open','operator','precedencegroup','private','protocol','public','rethrows','static','struct','subscript','typealias','var','break','case','catch','continue','default','defer','do','else','fallthrough','for','guard','if','in','repeat','return','throw','switch','where','while','as','Any','catch','false','is','nil','rethrows','self','Self','super','throw','throws','true','try','associativity','convenience','didSet','dynamic','final','get','indirect','lazy','left','mutating','none','nonmutating','optional','override','postfix','precedence','prefix','Protocol','required','right','set','some','Type','unowned','weak','willSet'],
    dart: ['abstract','as','assert','async','await','break','case','catch','class','const','continue','covariant','default','deferred','do','dynamic','else','enum','export','extends','extension','external','factory','false','final','finally','for','Function','get','hide','if','implements','import','in','interface','is','late','library','mixin','new','null','on','operator','part','required','rethrow','return','set','show','static','super','switch','sync','this','throw','true','try','typedef','var','void','while','with','yield'],
    bash: ['if','then','else','elif','fi','for','while','do','done','case','esac','function','in','select','time','until','declare','local','export','return','exit','echo','printf','read','source','alias','unalias','set','unset','shift','eval','exec','trap','wait','break','continue','true','false','test','let','expr'],
    sql: ['select','from','where','and','or','not','insert','into','values','update','set','delete','create','table','drop','alter','add','column','primary','key','foreign','references','index','view','database','schema','join','inner','left','right','outer','full','on','group','by','order','asc','desc','having','limit','offset','union','all','distinct','as','null','is','in','between','like','exists','count','sum','avg','max','min','case','when','then','else','end','begin','commit','rollback','transaction','with','recursive','over','partition','row_number','rank','coalesce','cast','convert','varchar','int','integer','float','decimal','boolean','date','datetime','timestamp','char','text','auto_increment','not','constraint','unique','check','default'],
    r: ['if','else','repeat','while','function','for','in','next','break','TRUE','FALSE','NULL','Inf','NaN','NA','NA_integer_','NA_real_','NA_complex_','NA_character_','...','..1','..2'],
    vue: ['template','script','style','setup','ref','reactive','computed','watch','watchEffect','onMounted','onUnmounted','onCreated','onUpdated','defineProps','defineEmits','defineExpose','withDefaults','inject','provide'],
  };
  KW.typescript=KW.ts;
  KW.react=[...KW.js,'jsx','tsx','useState','useEffect','useContext','useReducer','useRef','useMemo','useCallback','createContext','forwardRef','memo','Fragment','Suspense','lazy','StrictMode'];
  KW.sass=[...['@mixin','@include','@extend','@import','@use','@forward','@each','@for','@while','@if','@else','@function','@return','@at-root','@charset','@namespace','@media','@supports','@keyframes','@font-face','@page','!default','!global','!optional']];

  const BUILTINS = {
    js: ['console','Math','Array','Object','String','Number','Boolean','Date','RegExp','JSON','Promise','Map','Set','WeakMap','WeakSet','Symbol','Proxy','Reflect','Error','TypeError','parseInt','parseFloat','isNaN','isFinite','encodeURI','decodeURI','setTimeout','clearTimeout','setInterval','clearInterval','requestAnimationFrame','document','window','navigator','location','history','localStorage','sessionStorage','fetch','XMLHttpRequest','WebSocket','Worker','alert','confirm','prompt','require','module','exports','process','Buffer','__dirname','__filename','globalThis'],
    python: ['print','len','range','type','int','float','str','list','dict','tuple','set','frozenset','bool','bytes','bytearray','memoryview','complex','input','open','super','property','staticmethod','classmethod','enumerate','zip','map','filter','sorted','reversed','max','min','sum','abs','round','divmod','pow','hash','id','repr','format','ord','chr','bin','oct','hex','isinstance','issubclass','hasattr','getattr','setattr','delattr','vars','dir','globals','locals','exec','eval','compile','__import__','object','type','BaseException','Exception','ValueError','TypeError','KeyError','IndexError','AttributeError','ImportError','OSError','IOError','RuntimeError','StopIteration','GeneratorExit','SystemExit','NotImplementedError'],
    luau: ['print','warn','error','assert','pcall','xpcall','pairs','ipairs','next','select','unpack','rawget','rawset','rawequal','rawlen','type','tostring','tonumber','setmetatable','getmetatable','task','wait','delay','spawn','coroutine','math','string','table','bit32','utf8','workspace','game','script','Instance','Vector2','Vector3','Color3','CFrame','BrickColor','UDim','UDim2','Rect','Region3','NumberSequence','ColorSequence','NumberRange','PhysicalProperties','Random','RaycastParams','TweenService','TweenInfo','Enum','RunService','UserInputService','Players','ReplicatedStorage','ServerStorage','Workspace','Lighting','SoundService','PathfindingService','DataStoreService','HttpService','CollectionService'],
    lua: ['print','type','tostring','tonumber','ipairs','pairs','next','select','unpack','rawget','rawset','rawequal','rawlen','pcall','xpcall','error','assert','require','setmetatable','getmetatable','collectgarbage','dofile','load','loadfile','loadstring','module','rawget','rawset','io','os','math','string','table','coroutine','package','debug','utf8'],
    java: ['System','String','Integer','Long','Double','Float','Boolean','Character','Byte','Short','Math','Object','Class','Arrays','Collections','ArrayList','LinkedList','HashMap','HashSet','TreeMap','TreeSet','LinkedHashMap','Scanner','PrintStream','StringBuilder','StringBuffer','Iterator','Iterable','Comparable','Comparator','Optional','Stream','List','Map','Set','Queue','Stack','Thread','Runnable','Exception','RuntimeException','NullPointerException','IllegalArgumentException','IndexOutOfBoundsException','IOException'],
    cpp: ['std','cout','cin','cerr','endl','string','vector','map','set','unordered_map','unordered_set','list','deque','queue','stack','pair','tuple','array','bitset','iostream','fstream','sstream','algorithm','numeric','memory','functional','thread','mutex','chrono','filesystem','optional','variant','any','printf','scanf','malloc','free','new','delete','sizeof','nullptr','INT_MAX','INT_MIN','SIZE_MAX','UINT_MAX','DBL_MAX','FLT_MAX'],
    python: ['print','len','range','type','int','float','str','list','dict','tuple','set','bool','input','open','super','property','enumerate','zip','map','filter','sorted','reversed','max','min','sum','abs','round','isinstance','hasattr','getattr','setattr','format','repr','ord','chr','bin','oct','hex','id','hash','vars','dir'],
    csharp: ['Console','Math','String','Int32','Double','Boolean','DateTime','TimeSpan','List','Dictionary','HashSet','Queue','Stack','Linq','File','Directory','Path','Thread','Task','Exception','Type','Object','Convert','Array','Tuple','StringBuilder','Regex','HttpClient','JsonSerializer'],
    php: ['echo','print','var_dump','print_r','isset','empty','unset','array','count','strlen','strpos','substr','str_replace','sprintf','printf','date','time','mktime','array_push','array_pop','array_merge','array_keys','array_values','array_map','array_filter','array_sort','sort','rsort','ksort','krsort','in_array','array_search','explode','implode','trim','ltrim','rtrim','strtolower','strtoupper','ucfirst','nl2br','htmlspecialchars','htmlentities','json_encode','json_decode','file_get_contents','file_put_contents','header','session_start','$_GET','$_POST','$_SESSION','$_COOKIE','$_SERVER','$_FILES','$_REQUEST','$_ENV','$_GLOBALS'],
    ruby: ['puts','print','p','pp','gets','chomp','require','require_relative','attr_accessor','attr_reader','attr_writer','initialize','raise','rescue','ensure','super','include','extend','prepend','lambda','proc','block_given?','yield','send','respond_to?','nil?','is_a?','kind_of?','instance_of?','class','object_id','freeze','frozen?','dup','clone','to_s','to_i','to_f','to_a','to_h','inspect','map','each','select','reject','reduce','inject','find','detect','any?','all?','none?','count','flatten','compact','uniq','sort','sort_by'],
    go: ['fmt','os','io','bufio','strings','strconv','math','sort','sync','time','http','json','log','errors','context','reflect','unicode','bytes','regexp','path','filepath','runtime'],
    rust: ['println!','print!','eprintln!','format!','vec!','assert!','assert_eq!','assert_ne!','panic!','todo!','unimplemented!','unreachable!','dbg!','write!','writeln!','include!','concat!','env!','option_env!','file!','line!','column!','module_path!','cfg!','matches!','String','Vec','HashMap','HashSet','BTreeMap','BTreeSet','Option','Result','Box','Rc','Arc','Cell','RefCell','Mutex','RwLock','Cow','PhantomData','std','io','fs','path','env','process','thread','sync','collections','fmt','str','char','u8','u16','u32','u64','u128','usize','i8','i16','i32','i64','i128','isize','f32','f64','bool'],
    kotlin: ['println','print','readLine','arrayOf','listOf','mutableListOf','mapOf','mutableMapOf','setOf','mutableSetOf','hashMapOf','linkedMapOf','sortedMapOf','emptyList','emptyMap','emptySet','buildList','buildMap','buildSet','also','apply','let','run','with','takeIf','takeUnless','repeat','forEach','forEachIndexed','map','filter','flatMap','reduce','fold','any','all','none','find','first','last','count','sum','maxOrNull','minOrNull','sorted','sortedBy','groupBy','associate','partition','zip','unzip','chunked','windowed','drop','take','distinct','distinctBy'],
    swift: ['print','debugPrint','dump','assert','precondition','fatalError','Swift','Foundation','UIKit','SwiftUI','Combine','CoreData','MapKit','AVFoundation','Array','Dictionary','Set','Optional','Result','String','Int','Double','Float','Bool','Character','Data','Date','URL','UUID','DispatchQueue','NotificationCenter','UserDefaults','Bundle','FileManager','NSObject','NSString','NSArray','NSDictionary'],
    dart: ['print','debugPrint','assert','throw','rethrow','identical','identical','identityHashCode','Navigator','BuildContext','Widget','StatelessWidget','StatefulWidget','State','setState','initState','dispose','build','MaterialApp','Scaffold','AppBar','Container','Row','Column','Text','TextStyle','Color','Colors','Icons','IconButton','ElevatedButton','TextButton','TextField','ListView','GridView','StreamBuilder','FutureBuilder','Future','Stream','async','await','then','catchError','whenComplete'],
    bash: ['echo','printf','read','cd','ls','pwd','cp','mv','rm','mkdir','rmdir','touch','cat','grep','sed','awk','find','sort','uniq','cut','head','tail','wc','chmod','chown','ln','tar','zip','unzip','curl','wget','ssh','scp','git','npm','pip','python','python3','node','java','javac','gcc','g++','make','cmake'],
    sql: ['COUNT','SUM','AVG','MAX','MIN','UPPER','LOWER','LENGTH','TRIM','LTRIM','RTRIM','SUBSTRING','REPLACE','CONCAT','COALESCE','NULLIF','CASE','CAST','CONVERT','NOW','CURDATE','CURTIME','DATE_FORMAT','YEAR','MONTH','DAY','HOUR','MINUTE','SECOND','DATEDIFF','DATE_ADD','DATE_SUB','IFNULL','IF','IIF','ISNULL','NVL','DECODE','ROW_NUMBER','RANK','DENSE_RANK','LEAD','LAG','FIRST_VALUE','LAST_VALUE','NTILE','PERCENT_RANK','CUME_DIST','OVER','PARTITION','WITHIN','GROUP_CONCAT','STRING_AGG','LISTAGG','ARRAY_AGG','JSONB_BUILD_OBJECT'],
  };

  // ── Tokenizer / Highlighter ──
  function _hl(code, lang) {
    if(!code) return '';
    const kw = new Set((KW[lang]||KW.js||[]).map(k=>k.toLowerCase()));
    const bi = new Set((BUILTINS[lang]||[]).map(b=>b.toLowerCase()));
    const isLua = lang==='lua'||lang==='luau';
    const isPy = lang==='python'||lang==='bash'||lang==='r';
    const lineCommentStr = isLua||lang==='gdscript' ? '--' : isPy ? '#' : lang==='sql' ? '--' : '//';

    let out='', i=0;
    const L=code.length;
    const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    while(i<L){
      const rest=code.slice(i);

      // Line comment
      if(rest.startsWith(lineCommentStr)){
        const nl=code.indexOf('\n',i);
        const end=nl===-1?L:nl;
        out+=`<span class="tk-cmt">${esc(code.slice(i,end))}</span>`;
        i=end; continue;
      }
      // Block comment /* */
      if(rest.startsWith('/*')&&!isLua&&!isPy){
        const end=code.indexOf('*/',i+2);
        const e=end===-1?L:end+2;
        out+=`<span class="tk-cmt">${esc(code.slice(i,e))}</span>`;
        i=e; continue;
      }
      // String (double, single, backtick)
      if('"\'`'.includes(code[i])){
        const q=code[i]; let j=i+1; let s=q;
        while(j<L){
          if(code[j]==='\\'){s+=esc(code.slice(j,j+2));j+=2;continue;}
          s+=esc(code[j]); if(code[j]===q){j++;break;} j++;
        }
        out+=`<span class="tk-str">${s}</span>`;
        i=j; continue;
      }
      // Number
      if(/\d/.test(code[i]||(code[i]==='-'&&/\d/.test(code[i+1]||'')))){
        let j=i; if(code[j]==='-') j++;
        while(j<L&&/[\d.xXbBoO_eE]/.test(code[j])) j++;
        out+=`<span class="tk-num">${esc(code.slice(i,j))}</span>`;
        i=j; continue;
      }
      // Word (keyword, builtin, identifier)
      if(/[a-zA-Z_$]/.test(code[i])){
        let j=i;
        while(j<L&&/[\w$]/.test(code[j])) j++;
        const word=code.slice(i,j);
        const wl=word.toLowerCase();
        if(kw.has(wl)) out+=`<span class="tk-kw">${esc(word)}</span>`;
        else if(bi.has(wl)) out+=`<span class="tk-bi">${esc(word)}</span>`;
        else if(/^[A-Z]/.test(word)) out+=`<span class="tk-cls">${esc(word)}</span>`;
        else out+=esc(word);
        i=j; continue;
      }
      // Operators
      if('=+-*/%&|^~<>!'.includes(code[i])){
        out+=`<span class="tk-op">${esc(code[i])}</span>`; i++; continue;
      }
      // Brackets with rainbow
      const rb=['rb0','rb1','rb2','rb3','rb4'];
      if('([{'.includes(code[i])){
        const d=(out.match(/class="rb/g)||[]).length%5;
        out+=`<span class="${rb[d]}">${esc(code[i])}</span>`; i++; continue;
      }
      if(')]}'.includes(code[i])){
        out+=`<span class="tk-op">${esc(code[i])}</span>`; i++; continue;
      }
      out+=esc(code[i]); i++;
    }
    return out;
  }

  function _gutter(code){
    return code.split('\n').map((_,i)=>`<div>${i+1}</div>`).join('');
  }

  // ── STARTERS ──
  const STARTERS = {
    js:`// JavaScript — Ctrl+Enter para ejecutar
const saludar = (nombre) => \`¡Hola, \${nombre}!\`;

['Ana', 'Carlos', 'María'].forEach((n, i) => {
  console.log(\`\${i+1}. \${saludar(n)}\`);
});

// Función con clase
class Animal {
  constructor(nombre, sonido) {
    this.nombre = nombre;
    this.sonido = sonido;
  }
  hablar() { return \`\${this.nombre} dice: \${this.sonido}\`; }
}

const perro = new Animal('Firulais', '¡Guau!');
console.log(perro.hablar());`,

    html:`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  body { background: #1a1a2e; color: #e0e0e0; font-family: system-ui; display: grid; place-items: center; min-height: 100vh; margin: 0; }
  .card { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); border-radius: 16px; padding: 32px; text-align: center; max-width: 400px; }
  h1 { background: linear-gradient(135deg, #7c8cff, #b06cff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 2rem; margin: 0 0 12px; }
  button { background: #7c8cff; color: white; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-size: 1rem; margin-top: 16px; transition: all .2s; }
  button:hover { background: #a0acff; transform: translateY(-2px); }
  #contador { font-size: 3rem; font-weight: bold; color: #00d4ff; }
</style>
</head>
<body>
  <div class="card">
    <h1>¡Códice! 🚀</h1>
    <div id="contador">0</div>
    <p>Haz clic para contar</p>
    <button onclick="incrementar()">＋ Incrementar</button>
    <button onclick="resetear()" style="background:#ff5f5f;margin-left:8px">Reset</button>
  </div>
  \x3cscript>
    let n = 0;
    function incrementar() { document.getElementById('contador').textContent = ++n; }
    function resetear() { n = 0; document.getElementById('contador').textContent = 0; }
  <\/script>
</body>
</html>`,

    python:`# Python — simulado (output en consola)
import math

def fibonacci(n):
    a, b = 0, 1
    secuencia = []
    for _ in range(n):
        secuencia.append(a)
        a, b = b, a + b
    return secuencia

print("Fibonacci(10):", fibonacci(10))
print("Pi:", round(math.pi, 4))

# Lista por comprensión
cuadrados = [x**2 for x in range(1, 6)]
print("Cuadrados:", cuadrados)

# Clase
class Persona:
    def __init__(self, nombre, edad):
        self.nombre = nombre
        self.edad = edad
    def __str__(self):
        return f"{self.nombre} ({self.edad} años)"

p = Persona("Ana", 25)
print("Persona:", p)`,

    luau:`-- Luau (Roblox Studio) — UI Builder
-- Este código crea una interfaz gráfica en Roblox
-- Prueba modificar colores, tamaños y textos

-- Servicios
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

-- Obtener jugador local
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- Crear ScreenGui
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "MiPanel"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui

-- Frame principal
local mainFrame = Instance.new("Frame")
mainFrame.Name = "MainFrame"
mainFrame.Size = UDim2.new(0, 300, 0, 200)
mainFrame.Position = UDim2.new(0.5, -150, 0.5, -100)
mainFrame.BackgroundColor3 = Color3.fromRGB(30, 30, 46)
mainFrame.BorderSizePixel = 0
mainFrame.Parent = screenGui

-- Esquinas redondeadas
local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 12)
corner.Parent = mainFrame

-- Título
local titulo = Instance.new("TextLabel")
titulo.Text = "🎮 Mi Panel"
titulo.Size = UDim2.new(1, 0, 0, 40)
titulo.Position = UDim2.new(0, 0, 0, 0)
titulo.BackgroundColor3 = Color3.fromRGB(124, 140, 255)
titulo.TextColor3 = Color3.new(1, 1, 1)
titulo.TextSize = 18
titulo.Font = Enum.Font.GothamBold
titulo.Parent = mainFrame

-- Botón de acción
local btn = Instance.new("TextButton")
btn.Text = "¡Presióname!"
btn.Size = UDim2.new(0.8, 0, 0, 44)
btn.Position = UDim2.new(0.1, 0, 0.5, 0)
btn.BackgroundColor3 = Color3.fromRGB(46, 204, 143)
btn.TextColor3 = Color3.new(1, 1, 1)
btn.TextSize = 16
btn.Font = Enum.Font.GothamBold
btn.Parent = mainFrame

-- Esquinas del botón
local btnCorner = Instance.new("UICorner")
btnCorner.CornerRadius = UDim.new(0, 8)
btnCorner.Parent = btn

-- Evento del botón
btn.MouseButton1Click:Connect(function()
    print("¡Botón presionado!")
    -- Animación
    local tween = TweenService:Create(btn, 
        TweenInfo.new(0.1), 
        {Size = UDim2.new(0.75, 0, 0, 40)}
    )
    tween:Play()
    tween.Completed:Connect(function()
        local tweenBack = TweenService:Create(btn,
            TweenInfo.new(0.1),
            {Size = UDim2.new(0.8, 0, 0, 44)}
        )
        tweenBack:Play()
    end)
end)

print("✅ Panel creado correctamente")
print("Frame:", mainFrame.Name)
print("Botón:", btn.Text)`,

    lua:`-- Lua 5.4 — Scripting general
-- Ctrl+Enter para ejecutar (output simulado)

-- Funciones básicas
local function factorial(n)
    if n <= 1 then return 1 end
    return n * factorial(n - 1)
end

-- Tablas (arrays/diccionarios)
local frutas = {"manzana", "banana", "cereza", "durazno"}
local precios = {manzana = 10, banana = 5, cereza = 25}

-- Iterar
print("=== Frutas ===")
for i, fruta in ipairs(frutas) do
    local precio = precios[fruta] or "N/A"
    print(string.format("%d. %s — $%s", i, fruta, precio))
end

-- Factorial
for i = 1, 8 do
    print(string.format("  %d! = %d", i, factorial(i)))
end

-- Programación orientada a objetos en Lua
local Animal = {}
Animal.__index = Animal

function Animal.new(nombre, tipo)
    return setmetatable({nombre=nombre, tipo=tipo}, Animal)
end

function Animal:saludar()
    return string.format("Soy %s, un %s", self.nombre, self.tipo)
end

local gato = Animal.new("Michi", "gato")
print(gato:saludar())
print("✅ Script ejecutado")`,

    java:`// Java — simulado
public class Main {
    
    // Clase interna
    static class Calculadora {
        private double memoria = 0;
        
        public double sumar(double a, double b) { return a + b; }
        public double restar(double a, double b) { return a - b; }
        public double multiplicar(double a, double b) { return a * b; }
        public double dividir(double a, double b) {
            if (b == 0) throw new ArithmeticException("División por cero");
            return a / b;
        }
        public void guardarMemoria(double val) { this.memoria = val; }
        public double recuperarMemoria() { return this.memoria; }
    }
    
    public static void main(String[] args) {
        Calculadora calc = new Calculadora();
        
        System.out.println("=== Calculadora Java ===");
        System.out.println("10 + 5 = " + calc.sumar(10, 5));
        System.out.println("10 - 5 = " + calc.restar(10, 5));
        System.out.println("10 × 5 = " + calc.multiplicar(10, 5));
        System.out.println("10 / 5 = " + calc.dividir(10, 5));
        
        // Array y loop
        int[] numeros = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
        int suma = 0;
        for (int n : numeros) suma += n;
        System.out.println("Suma 1-10: " + suma);
        System.out.println("✅ Programa ejecutado");
    }
}`,

    sql:`-- SQL — simulado con output
-- Ctrl+Enter para ver el resultado

CREATE TABLE empleados (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    departamento VARCHAR(50),
    salario DECIMAL(10,2),
    fecha_ingreso DATE
);

INSERT INTO empleados (nombre, departamento, salario, fecha_ingreso) VALUES
    ('Ana García',    'Desarrollo',  75000.00, '2021-03-15'),
    ('Carlos López',  'Diseño',      65000.00, '2020-07-01'),
    ('María Torres',  'Desarrollo',  80000.00, '2019-11-20'),
    ('Luis Ramírez',  'Marketing',   55000.00, '2022-01-10'),
    ('Sofia Mendez',  'Desarrollo',  90000.00, '2018-05-30');

-- Consulta: promedio por departamento
SELECT 
    departamento,
    COUNT(*) as empleados,
    AVG(salario) as salario_promedio,
    MAX(salario) as salario_maximo
FROM empleados
GROUP BY departamento
ORDER BY salario_promedio DESC;`,
  };

  // ── Run HTML/JS/CSS in iframe ──
  function _runHTML(code, lang, iframeId, consoleEl) {
    let src = code;
    if(lang === 'js') {
      src = `<!DOCTYPE html><html><body style="margin:0;padding:12px;background:#1a1a2e;color:#e0e0e0;font-family:system-ui">
<pre id="_out" style="margin:0;font-family:monospace;font-size:.85rem;line-height:1.6;white-space:pre-wrap"></pre>
\x3cscript>
const _out=document.getElementById('_out');
function _log(type,...a){
  const msg=a.map(x=>typeof x==='object'?JSON.stringify(x,null,2):String(x)).join(' ');
  const line=document.createElement('div');
  line.style.color=type==='error'?'#ff5f5f':type==='warn'?'#f5a623':type==='info'?'#00d4ff':'#cdd1f4';
  line.style.borderBottom='1px solid rgba(255,255,255,.04)';
  line.style.padding='2px 0';
  line.textContent=(type==='error'?'✕ ':type==='warn'?'⚠ ':type==='info'?'ℹ ':'')+msg;
  _out.appendChild(line);
  window.parent.postMessage({type:'pg-console',level:type,msg},'*');
}
console.log=(...a)=>_log('log',...a);
console.error=(...a)=>_log('error',...a);
console.warn=(...a)=>_log('warn',...a);
console.info=(...a)=>_log('info',...a);
window.onerror=(m,s,l)=>{_log('error',m+' (línea '+l+')');return true};
try{${code}}catch(e){_log('error',e.message)}
<\/script></body></html>`;
    } else if(lang === 'css') {
      src = `<!DOCTYPE html><html><head><style>body{margin:8px;background:#1a1a2e}${code}</style></head><body><h2 class="demo-title">Preview CSS</h2><p class="demo-text">Texto de ejemplo para ver estilos.</p><div class="demo-box">Caja de ejemplo</div><button class="demo-btn">Botón</button></body></html>`;
    } else if(lang === 'react') {
      src = `<!DOCTYPE html><html><head>
<script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
<style>body{margin:0;background:#1a1a2e}</style></head>
<body><div id="root"></div>
\x3cscript type="text/babel">
${code.replace(/^import.*?;?\s*$/mg,'').replace(/^export\s+default\s+/m,'')}
const root=ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(typeof App!=='undefined'?App:()=>React.createElement('div',{style:{color:'white',padding:'1rem'}},'Componente no encontrado — asegúrate de exportar App')));
<\/script></body></html>`;
    }
    const blob=new Blob([src],{type:'text/html'});
    const url=URL.createObjectURL(blob);
    const iframe=document.getElementById(iframeId);
    if(iframe){ iframe.src=url; setTimeout(()=>URL.revokeObjectURL(url),8000); }
    return true;
  }

  // ══════════════════════════════════════════════════════════════
  //  CONSOLA DEVTOOLS — línea, tipo, sugerencia
  // ══════════════════════════════════════════════════════════════
  function _cline(el, type, msg, lineNum, suggestion){
    if(!el) return;
    const empty=el.querySelector('.pg-empty');
    if(empty) empty.remove();
    const d=document.createElement('div');
    d.className=`pg-cline ${type}`;

    // Badge de línea (estilo DevTools)
    let html='';
    if(lineNum!=null){
      html+=`<span style="color:var(--t2);font-size:.65rem;min-width:44px;display:inline-block;flex-shrink:0">Línea ${lineNum}</span>`;
    }
    // Ícono según tipo
    const icons={log:'›',info:'ℹ',warn:'⚠',err:'✕',ok:'✓',hint:'💡'};
    html+=`<span style="flex:1;word-break:break-all">${_escHtml(String(msg))}</span>`;
    d.innerHTML=html;

    // Sugerencia desplegable (estilo DevTools)
    if(suggestion){
      const hint=document.createElement('div');
      hint.style.cssText='margin-top:3px;padding:4px 8px 4px 44px;background:rgba(124,140,255,.08);border-left:2px solid var(--ac);border-radius:0 4px 4px 0;font-size:.72rem;color:var(--ach);line-height:1.5';
      hint.textContent='💡 '+suggestion;
      d.appendChild(hint);
    }
    el.appendChild(d);
    el.scrollTop=el.scrollHeight;
  }

  function _escHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // ══════════════════════════════════════════════════════════════
  //  ANALIZADOR SINTÁCTICO LUA/LUAU — errores + sugerencias
  // ══════════════════════════════════════════════════════════════
  function _luaLint(code, consoleEl, isLuau){
    const lines=code.split('\n');
    const errors=[];
    const warnings=[];

    // Tabla de sugerencias por patrón de error
    const SUGGESTIONS={
      'end_missing':   'Cada bloque if/for/while/function necesita un "end" al cerrar.',
      'then_missing':  'Después de la condición en "if ... then" siempre va "then".',
      'do_missing':    'Los bloques for/while necesitan "do" antes del cuerpo.',
      'assign_wrong':  'En Lua la asignación es "=" y la comparación es "==" o "~=".',
      'concat_wrong':  'Para concatenar strings en Lua usa ".." en lugar de "+".',
      'semicolon':     'Lua no usa ";" al final de línea (es opcional y no recomendado).',
      'null_vs_nil':   'En Lua no existe "null", se usa "nil".',
      'true_false':    '"true"/"false" en Lua van en minúsculas.',
      'length_wrong':  'Para el largo de una tabla o string usa "#tabla" en Lua.',
      'arrow_fn':      'Lua no tiene arrow functions (=>). Usa "function(x) return ... end".',
      'print_concat':  'Para imprimir múltiples valores en print() en Lua usa comas: print(a, b) o concatena con "..".',
      'global_warn':   'Evita variables globales en Luau. Usa "local" para mayor rendimiento y seguridad.',
      'service_warn':  'Para obtener servicios en Roblox usa game:GetService("NombreServicio").',
    };

    // Conteo de bloques para verificar balance
    // Usamos una estrategia más robusta: contamos keywords de apertura vs cierre
    let depth=0, blockStack=[];
    lines.forEach((rawLine,i)=>{
      const ln=i+1;
      // Quitar comentarios y strings para el análisis
      const line=rawLine.replace(/--.*$/,'').replace(/"[^"]*"/g,'""').replace(/'[^']*'/g,"''");
      const trimmed=line.trim();
      if(!trimmed) return;

      // Cuenta aperturas: function, do (standalone/for/while), then (de if/elseif), repeat
      // Evita doble-contar: "if cond then" cuenta 1 (solo "then"), no "do" ni "function" extra
      let opens=0;
      // function keyword — puede ser en cualquier posición
      const fnMatches=(line.match(/\bfunction\b/g)||[]).length;
      opens+=fnMatches;
      // "do" standalone (for/while body) — pero NO el "do" de "end" ni dentro de strings ya eliminados
      // Solo cuenta "do" que NO viene precedido de "end" en la misma línea
      const doMatches=(line.match(/\bdo\b/g)||[]).length;
      opens+=doMatches;
      // "then" de if/elseif
      const thenMatches=(line.match(/\bthen\b/g)||[]).length;
      opens+=thenMatches;
      // "repeat"
      const repeatMatches=(line.match(/\brepeat\b/g)||[]).length;
      opens+=repeatMatches;

      // Cuenta cierres: end, until
      const endMatches=(line.match(/\bend\b/g)||[]).length;
      const untilMatches=(line.match(/\buntil\b/g)||[]).length;
      const closes=endMatches+untilMatches;

      // También "else" y "elseif" NO cambian la profundidad neta (cierran el then anterior y abren otro then)
      // pero ya se contabiliza via thenMatches del elseif. Hay que restar el "then" de "else" sin if:
      // "else" puro: cierra 1 then, abre otro bloque implícito -> neto 0, ya manejado
      // Para simplificar: en lugar de line-by-line depth, solo verificamos balance total al final.

      depth += opens - closes;
      for(let x=0;x<opens;x++) blockStack.push(ln);
      for(let x=0;x<closes;x++) if(blockStack.length) blockStack.pop();

      if(depth<0){
        // Más ends que opens hasta este punto
        depth=0; blockStack=[];
      }

      // ── Comprobaciones línea a línea ──

      // if sin then
      if(/^\s*if\b/.test(rawLine) && !/\bthen\b/.test(rawLine) && !/--/.test(rawLine)){
        errors.push({ln, msg:`"if" sin "then" en esta línea`, key:'then_missing'});
      }
      // for/while sin do
      if(/^\s*(for|while)\b/.test(rawLine) && !/\bdo\b/.test(rawLine) && !rawLine.includes('--')){
        errors.push({ln, msg:`"${rawLine.match(/for|while/)[0]}" sin "do"`, key:'do_missing'});
      }
      // null (debería ser nil)
      if(/\bnull\b/.test(rawLine)){
        warnings.push({ln, msg:`"null" no existe en Lua, usa "nil"`, key:'null_vs_nil'});
      }
      // Concatenación con + entre strings
      if(/["'][^"']*["']\s*\+\s*["']/.test(rawLine)){
        warnings.push({ln, msg:`Concatenación de strings: usa ".." en lugar de "+"`, key:'concat_wrong'});
      }
      // Arrow functions
      if(/=>/.test(rawLine)){
        errors.push({ln, msg:`Lua no tiene arrow functions "=>". Usa "function(x) return ... end"`, key:'arrow_fn'});
      }
      // Variable global sin local (solo en Luau)
      if(isLuau && /^\s*(\w+)\s*=\s*[^=]/.test(rawLine) && !/^\s*local\b/.test(rawLine)
         && !/^\s*(if|elseif|while|for|repeat|return|break|end)\b/.test(rawLine)
         && !/[.:[\]]/.test(rawLine.split('=')[0])
         && !/\w+\s*\([^)]*\)\s*$/.test(rawLine.split('=')[0])){
        const varName=(rawLine.match(/^\s*(\w+)\s*=/)||[])[1];
        if(varName && !['true','false','nil'].includes(varName)){
          warnings.push({ln, msg:`Variable global "${varName}" detectada`, key:'global_warn'});
        }
      }
      // print con + en lugar de ..
      if(/\bprint\s*\([^)]*\+[^)]*\)/.test(rawLine)){
        warnings.push({ln, msg:`En print() usa comas o ".." para múltiples valores`, key:'print_concat'});
      }
    });

    // Bloques sin cerrar al final
    if(depth>0){
      const openAt=blockStack[blockStack.length-1]||'?';
      errors.push({ln:openAt, msg:`Bloque abierto en línea ${openAt} sin "end" al final del script`, key:'end_missing'});
    }

    // Emitir en consola
    errors.forEach(e=>{
      _cline(consoleEl,'err',e.msg, e.ln, SUGGESTIONS[e.key]);
    });
    warnings.forEach(w=>{
      _cline(consoleEl,'warn',w.msg, w.ln, SUGGESTIONS[w.key]);
    });
    return {errors, warnings};
  }

  // ══════════════════════════════════════════════════════════════
  //  INTÉRPRETE LUA/LUAU SIMULADO (evalúa expresiones reales)
  // ══════════════════════════════════════════════════════════════
  function _luaInterp(code, consoleEl, isLuau){
    const outputs=[];
    const vars={};   // {name: value}  — valores JS
    const fns={};    // funciones definidas
    const lines=code.split('\n');

    // ── Evalúa una expresión Lua sencilla a valor JS ──
    function evalExpr(expr, localVars){
      expr=expr.trim();
      const env={...vars, ...(localVars||{})};

      // nil / true / false
      if(expr==='nil')  return null;
      if(expr==='true') return true;
      if(expr==='false') return false;

      // Número
      if(/^-?\d+(\.\d+)?$/.test(expr)) return parseFloat(expr);
      if(/^0x[0-9a-fA-F]+$/.test(expr)) return parseInt(expr,16);

      // String con comillas dobles o simples
      const strM=expr.match(/^["']([\s\S]*?)["']$/);
      if(strM) return strM[1].replace(/\\n/g,'\n').replace(/\\t/g,'\t');

      // String con [[ ]]
      const longStrM=expr.match(/^\[\[([\s\S]*?)\]\]$/);
      if(longStrM) return longStrM[1];

      // Concatenación con ..
      if(expr.includes('..')){
        const parts=expr.split('..').map(p=>evalExpr(p.trim(),localVars));
        return parts.map(p=>p==null?'nil':String(p)).join('');
      }

      // Operaciones matemáticas básicas
      // Reemplaza variables por sus valores para eval seguro
      let mathExpr=expr;
      // Reemplaza math.xxx
      mathExpr=mathExpr.replace(/math\.pi/g,String(Math.PI));
      mathExpr=mathExpr.replace(/math\.huge/g,'Infinity');
      mathExpr=mathExpr.replace(/math\.floor\(([^)]+)\)/g,(_,a)=>String(Math.floor(evalExpr(a,localVars)||0)));
      mathExpr=mathExpr.replace(/math\.ceil\(([^)]+)\)/g,(_,a)=>String(Math.ceil(evalExpr(a,localVars)||0)));
      mathExpr=mathExpr.replace(/math\.sqrt\(([^)]+)\)/g,(_,a)=>String(Math.sqrt(evalExpr(a,localVars)||0)));
      mathExpr=mathExpr.replace(/math\.abs\(([^)]+)\)/g,(_,a)=>String(Math.abs(evalExpr(a,localVars)||0)));
      mathExpr=mathExpr.replace(/math\.random\((\d+)(?:,\s*(\d+))?\)/g,(_,a,b)=>
        b ? String(Math.floor(Math.random()*(parseInt(b)-parseInt(a)+1))+parseInt(a))
          : String(Math.floor(Math.random()*parseInt(a))+1));
      mathExpr=mathExpr.replace(/math\.max\(([^)]+)\)/g,(_,args)=>{
        const vals=args.split(',').map(a=>evalExpr(a.trim(),localVars));
        return String(Math.max(...vals.map(v=>typeof v==='number'?v:0)));
      });
      mathExpr=mathExpr.replace(/math\.min\(([^)]+)\)/g,(_,args)=>{
        const vals=args.split(',').map(a=>evalExpr(a.trim(),localVars));
        return String(Math.min(...vals.map(v=>typeof v==='number'?v:0)));
      });
      // tostring / tonumber
      mathExpr=mathExpr.replace(/tostring\(([^)]+)\)/g,(_,a)=>`"${evalExpr(a,localVars)}"`);
      mathExpr=mathExpr.replace(/tonumber\(([^)]+)\)/g,(_,a)=>String(parseFloat(evalExpr(a,localVars))||0));
      // string.len / #
      mathExpr=mathExpr.replace(/#(\w+)/g,(_,v)=>{
        const val=env[v]; if(typeof val==='string') return String(val.length);
        if(Array.isArray(val)) return String(val.length);
        return '0';
      });
      mathExpr=mathExpr.replace(/string\.len\(([^)]+)\)/g,(_,a)=>{
        const v=evalExpr(a,localVars); return String(typeof v==='string'?v.length:0);
      });
      mathExpr=mathExpr.replace(/string\.upper\(([^)]+)\)/g,(_,a)=>{
        const v=evalExpr(a,localVars); return `"${String(v||'').toUpperCase()}"`;
      });
      mathExpr=mathExpr.replace(/string\.lower\(([^)]+)\)/g,(_,a)=>{
        const v=evalExpr(a,localVars); return `"${String(v||'').toLowerCase()}"`;
      });
      mathExpr=mathExpr.replace(/string\.rep\(([^,]+),\s*(\d+)\)/g,(_,s,n)=>{
        const v=evalExpr(s.trim(),localVars); return `"${String(v||'').repeat(parseInt(n))}"`;
      });
      mathExpr=mathExpr.replace(/string\.reverse\(([^)]+)\)/g,(_,a)=>{
        const v=evalExpr(a,localVars); return `"${String(v||'').split('').reverse().join('')}"`;
      });
      mathExpr=mathExpr.replace(/string\.format\(["']([^"']+)["'],([^)]+)\)/g,(_,fmt,argsStr)=>{
        // Soporte básico de %d, %s, %f
        const argVals=argsStr.split(',').map(a=>evalExpr(a.trim(),localVars));
        let i=0;
        const result=fmt.replace(/%([dsf])/g,(m,t)=>{
          const v=argVals[i++];
          if(t==='d') return String(Math.floor(typeof v==='number'?v:parseInt(v)||0));
          if(t==='f') return String((typeof v==='number'?v:parseFloat(v)||0).toFixed(2));
          return String(v==null?'nil':v);
        });
        return `"${result}"`;
      });
      // Módulo con % → JS también es %
      mathExpr=mathExpr.replace(/\^/g,'**'); // Lua usa ^ para potencia

      // Reemplaza variables conocidas
      for(const [k,v] of Object.entries(env)){
        if(typeof v==='number'||typeof v==='boolean'||v===null){
          mathExpr=mathExpr.replace(new RegExp('\\b'+k+'\\b','g'), v===null?'null':String(v));
        } else if(typeof v==='string'){
          // Solo reemplaza fuera de strings ya existentes
          mathExpr=mathExpr.replace(new RegExp('\\b'+k+'\\b','g'),`"${v}"`);
        }
      }

      // Comparaciones Lua → JS
      mathExpr=mathExpr.replace(/~=/g,'!==').replace(/\band\b/g,'&&').replace(/\bor\b/g,'||').replace(/\bnot\b/g,'!');

      // Intenta evaluar la expresión matemática
      try{
        // Sólo evalúa si parece seguro (solo números, ops, parens, strings literales)
        if(/^[\d\s\+\-\*\/\%\*\^\(\)\.\,\"\'!&|<>=!]+$/.test(mathExpr.replace(/"[^"]*"/g,'""').replace(/true|false|null|Infinity/g,'1'))){
          const result=Function('"use strict";return ('+mathExpr+')')();
          return result;
        }
      }catch(_){}

      // Variable simple
      if(/^\w+$/.test(expr) && expr in env) return env[expr];

      // Llamada a función definida por usuario
      const callM=expr.match(/^(\w+)\(([^)]*)\)$/);
      if(callM && fns[callM[1]]){
        const argVals=callM[2].split(',').map(a=>evalExpr(a.trim(),localVars));
        return fns[callM[1]](argVals);
      }

      // Acceso a propiedad obj.Prop (ej: mainFrame.Name, btn.Text)
      const dotM=expr.match(/^(\w+)\.(\w+)$/);
      if(dotM){
        const key=dotM[1]+'.'+dotM[2];
        if(key in _interpInstProps) return _interpInstProps[key];
        // Si el objeto está en vars y es string, devuelve "obj"
        return expr;
      }

      return expr; // Devuelve como string si no se pudo evaluar
    }

    // ── Resuelve accesos de propiedad obj.Prop desde vars del intérprete ──
    // Los vars del intérprete solo guardan valores primitivos; las props de instancias
    // se registran en _interpInstProps para soportar mainFrame.Name, btn.Text, etc.
    const _interpInstProps = {}; // "varName.Prop" → value

    // ── Formatea un valor Lua para print() ──
    function luaToStr(v){
      if(v===null||v===undefined) return 'nil';
      if(v===true) return 'true';
      if(v===false) return 'false';
      if(typeof v==='number') return Number.isInteger(v)?String(v):v.toFixed(6).replace(/\.?0+$/,'');
      if(Array.isArray(v)) return '{table: '+v.length+' items}';
      return String(v);
    }

    // ── Parsea argumentos de print() respetando strings y expresiones ──
    function parsePrintArgs(argsStr){
      // Divide por comas respetando strings entre comillas
      const args=[];
      let cur='', depth2=0, inStr=false, strChar='';
      for(let i=0;i<argsStr.length;i++){
        const c=argsStr[i];
        if(!inStr && (c==='"'||c==="'")){ inStr=true; strChar=c; cur+=c; }
        else if(inStr && c===strChar && argsStr[i-1]!=='\\'){ inStr=false; cur+=c; }
        else if(!inStr && c==='('){ depth2++; cur+=c; }
        else if(!inStr && c===')'){ depth2--; cur+=c; }
        else if(!inStr && c===',' && depth2===0){ args.push(cur.trim()); cur=''; }
        else cur+=c;
      }
      if(cur.trim()) args.push(cur.trim());
      return args;
    }

    // ── Procesa cada línea del código ──
    let skipUntil=null; // para saltar líneas de bloques no soportados
    let loopOutputs=0;  // límite de output en loops
    const MAX_LOOP_OUT=50;

    // Pre-scan para recoger funciones definidas con function nombre(args)
    const fnDefRx=/^(?:local\s+)?function\s+(\w+)\s*\(([^)]*)\)([\s\S]*?)^end/gm;
    let fm;
    while((fm=fnDefRx.exec(code))!==null){
      const fnName=fm[1], fnParams=fm[2].split(',').map(s=>s.trim()).filter(Boolean), fnBody=fm[3];
      fns[fnName]=(argVals)=>{
        const localVars2={};
        fnParams.forEach((p,i)=>{ localVars2[p]=argVals[i]??null; });
        // Ejecuta el body de la función (solo print y return)
        const innerLines=fnBody.split('\n');
        let retVal=null;
        innerLines.forEach(il=>{
          const it=il.trim();
          const retM=it.match(/^return\s+(.+)$/);
          if(retM) retVal=evalExpr(retM[1],{...vars,...localVars2});
          const pM=it.match(/^print\s*\((.+)\)$/);
          if(pM){
            const vals=parsePrintArgs(pM[1]).map(a=>luaToStr(evalExpr(a,{...vars,...localVars2})));
            outputs.push({text:vals.join('\t'), type:'log'});
          }
        });
        return retVal;
      };
    }

    // Proceso línea a línea
    for(let li=0;li<lines.length;li++){
      if(loopOutputs>MAX_LOOP_OUT){ outputs.push({text:`[... output limitado a ${MAX_LOOP_OUT} líneas]`,type:'warn'}); break; }
      const rawLine=lines[li];
      const stripped=rawLine.replace(/--.*$/,'').trim();
      if(!stripped) continue;

      // ── local var = expr ──
      const localM=stripped.match(/^local\s+(\w+)\s*=\s*(.+)$/);
      if(localM){
        // Si la expresión es un llamado a método Roblox (obj:Method o game:GetService etc.), guarda nil
        if(/\w+[:\.]\w+\s*\(/.test(localM[2]) && !localM[2].includes('Instance.new')){
          vars[localM[1]]=null; // nil — objeto Roblox no simulable
          continue;
        }
        const val=evalExpr(localM[2],vars);
        vars[localM[1]]=val;
        continue;
      }

      // ── var = expr (sin local) ──
      const assignM=stripped.match(/^(\w+)\s*=\s*([^=].*)$/) ;
      if(assignM && !['if','then','else','elseif','end','for','while','do','repeat','until','return','function','local','and','or','not','break'].includes(assignM[1])){
        const val=evalExpr(assignM[2],vars);
        vars[assignM[1]]=val;
        continue;
      }

      // ── var += / -= (no nativo Lua pero frecuente con aug assign) ──
      const augM=stripped.match(/^(\w+)\s*(\+=|-=|\*=|\/=)(.+)$/);
      if(augM){
        const cur2=typeof vars[augM[1]]==='number'?vars[augM[1]]:0;
        const rhs=typeof evalExpr(augM[3].trim(),vars)==='number'?evalExpr(augM[3].trim(),vars):0;
        if(augM[2]==='+=') vars[augM[1]]=cur2+rhs;
        else if(augM[2]==='-=') vars[augM[1]]=cur2-rhs;
        else if(augM[2]==='*=') vars[augM[1]]=cur2*rhs;
        else if(augM[2]==='/=') vars[augM[1]]=cur2/(rhs||1);
        continue;
      }

      // ── obj.Prop = val — registra propiedades de instancias ──
      const objPropM=stripped.match(/^(\w+)\.(\w+)\s*=\s*(.+)$/);
      if(objPropM && !['Parent','ResetOnSpawn'].includes(objPropM[2])){
        const propKey=objPropM[1]+'.'+objPropM[2];
        const rawVal=objPropM[3].trim();
        // Intenta obtener valor primitivo (string o número)
        const strV=rawVal.match(/^["']([\s\S]*?)["']$/);
        if(strV) _interpInstProps[propKey]=strV[1];
        else{
          const numV=parseFloat(rawVal);
          if(!isNaN(numV)) _interpInstProps[propKey]=numV;
          else _interpInstProps[propKey]=rawVal;
        }
        continue;
      }

      // ── print(...) ──
      const printM=stripped.match(/^print\s*\((.+)\)$/);
      if(printM){
        const vals=parsePrintArgs(printM[1]).map(a=>luaToStr(evalExpr(a,vars)));
        outputs.push({text:vals.join('\t'), type:'log'});
        loopOutputs++;
        continue;
      }

      // ── warn(...) Luau ──
      const warnM=stripped.match(/^warn\s*\((.+)\)$/);
      if(warnM){
        const vals=parsePrintArgs(warnM[1]).map(a=>luaToStr(evalExpr(a,vars)));
        outputs.push({text:'[warn] '+vals.join('\t'), type:'warn'});
        loopOutputs++;
        continue;
      }

      // ── error(...) ──
      const errM=stripped.match(/^error\s*\((.+)\)$/);
      if(errM){
        const msg=luaToStr(evalExpr(errM[1],vars));
        outputs.push({text:'[error] '+msg, type:'err', ln:li+1});
        loopOutputs++;
        continue;
      }

      // ── for i = start, stop [, step] do ... end ──
      const numForM=stripped.match(/^for\s+(\w+)\s*=\s*([^,]+),\s*([^,\s]+)(?:,\s*([^,\s]+))?\s+do\s*$/);
      if(numForM){
        const varN=numForM[1];
        const start=evalExpr(numForM[2].trim(),vars);
        const stop=evalExpr(numForM[3].trim(),vars);
        const step=numForM[4]?evalExpr(numForM[4].trim(),vars):1;
        if(typeof start!=='number'||typeof stop!=='number'||typeof step!=='number') continue;
        // Recoge el cuerpo del for hasta el end correspondiente
        const bodyLines=[];
        let forDepth=1, fj=li+1;
        while(fj<lines.length&&forDepth>0){
          const fl=lines[fj].replace(/--.*$/,'').trim();
          if(/\b(function|do|then|repeat)\b/.test(fl)) forDepth++;
          if(/\bend\b/.test(fl)){ forDepth--; if(forDepth===0){fj++;break;} }
          bodyLines.push(lines[fj]);
          fj++;
        }
        li=fj-1;
        // Ejecuta el loop (max 200 iteraciones)
        const maxIter=Math.min(Math.abs((stop-start)/step)+1,200);
        for(let iv=start; step>0?iv<=stop:iv>=stop; iv+=step){
          if(loopOutputs>MAX_LOOP_OUT) break;
          vars[varN]=iv;
          // Ejecuta body del for (recursión limitada a prints)
          for(const bl of bodyLines){
            const bt=bl.replace(/--.*$/,'').trim();
            const bp=bt.match(/^print\s*\((.+)\)$/);
            if(bp){
              const vals=parsePrintArgs(bp[1]).map(a=>luaToStr(evalExpr(a,vars)));
              outputs.push({text:vals.join('\t'), type:'log'});
              loopOutputs++;
            }
            const bw=bt.match(/^warn\s*\((.+)\)$/);
            if(bw){ outputs.push({text:'[warn] '+luaToStr(evalExpr(bw[1],vars)), type:'warn'}); loopOutputs++; }
            const bla=bt.match(/^local\s+(\w+)\s*=\s*(.+)$/);
            if(bla) vars[bla[1]]=evalExpr(bla[2],vars);
            const bas=bt.match(/^(\w+)\s*=\s*([^=].*)$/);
            if(bas&&!['if','for','while','end','then','do'].includes(bas[1])) vars[bas[1]]=evalExpr(bas[2],vars);
          }
        }
        continue;
      }

      // ── for k, v in pairs(t) / ipairs(t) ──
      const iterForM=stripped.match(/^for\s+(\w+)(?:\s*,\s*(\w+))?\s+in\s+(pairs|ipairs)\s*\((\w+)\)\s+do\s*$/);
      if(iterForM){
        const kVar=iterForM[1], vVar=iterForM[2], tName=iterForM[4];
        const tbl=vars[tName];
        const bodyLines=[];
        let fd=1, fj=li+1;
        while(fj<lines.length&&fd>0){
          const fl=lines[fj].replace(/--.*$/,'').trim();
          if(/\b(function|do|then|repeat)\b/.test(fl)) fd++;
          if(/\bend\b/.test(fl)){ fd--; if(fd===0){fj++;break;} }
          bodyLines.push(lines[fj]);
          fj++;
        }
        li=fj-1;
        if(Array.isArray(tbl)){
          tbl.forEach((v,k)=>{
            if(loopOutputs>MAX_LOOP_OUT) return;
            vars[kVar]=iterForM[3]==='ipairs'?k+1:k;
            if(vVar) vars[vVar]=v;
            bodyLines.forEach(bl=>{
              const bt=bl.replace(/--.*$/,'').trim();
              const bp=bt.match(/^print\s*\((.+)\)$/);
              if(bp){ outputs.push({text:parsePrintArgs(bp[1]).map(a=>luaToStr(evalExpr(a,vars))).join('\t'),type:'log'}); loopOutputs++; }
            });
          });
        }
        continue;
      }

      // Llamada a método Roblox (obj:Method(...)) — ignorar silenciosamente
      if(/^\w+:\w+\s*\(/.test(stripped)) continue;

      // Acceso a propiedad en print — obj.Prop convertido a valor conocido si está en vars
      // Esto permite que print("Frame:", mainFrame.Name) funcione

      // ── Llamada a función ──
      const fnCallM=stripped.match(/^(\w+)\s*\(([^)]*)\)\s*$/);
      if(fnCallM && fns[fnCallM[1]]){
        const argVals=parsePrintArgs(fnCallM[2]).map(a=>evalExpr(a,vars));
        fns[fnCallM[1]](argVals);
        continue;
      }
    }

    return {outputs, vars};
  }

  // ══════════════════════════════════════════════════════════════
  //  UI PREVIEW ROBLOX — renderizador mejorado
  // ══════════════════════════════════════════════════════════════
  function _buildRobloxUI(code, vars){
    /* ═══════════════════════════════════════════════════════════════
       ROBLOX UI RENDERER v4 — Full LXNDXN + classic pattern support
       Handles both patterns:
         • Classic:  local f = Instance.new("Frame")
                     f.BackgroundColor3 = Color3.fromRGB(...)
         • New() helper: New("Frame",{BackgroundColor3=Color3.fromRGB(...),...})
       Also handles: UICorner, UIGradient, UIStroke, UIPadding,
                     UIListLayout, ColorSequence, UDim2, AnchorPoint,
                     transparency, TextWrapped, ZIndex ordering
    ═══════════════════════════════════════════════════════════════ */

    const instances = {};   // varName → { type, props, varName }
    const parentOf  = {};   // varName → parentVarName
    const order     = [];   // creation order
    let   _uid      = 0;
    function newId(){ return '__inst' + (++_uid); }

    // ── Color parsers ──────────────────────────────────────────────
    function parseColor(str){
      if(!str) return null;
      const rgb = str.match(/Color3\.fromRGB\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
      if(rgb) return `rgb(${rgb[1]},${rgb[2]},${rgb[3]})`;
      const n01 = str.match(/Color3\.new\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/);
      if(n01) return `rgb(${Math.round(n01[1]*255)},${Math.round(n01[2]*255)},${Math.round(n01[3]*255)})`;
      return null;
    }
    function parseUDim2(str){
      if(!str) return null;
      const m = str.match(/UDim2\.new\s*\(\s*(-?[\d.]+)\s*,\s*(-?\d+)\s*,\s*(-?[\d.]+)\s*,\s*(-?\d+)\s*\)/);
      if(m) return { xs:parseFloat(m[1]), xo:parseInt(m[2]), ys:parseFloat(m[3]), yo:parseInt(m[4]) };
      return null;
    }
    function parseUDim(str){
      if(!str) return null;
      const m = str.match(/UDim\.new\s*\(\s*([\d.]+)\s*,\s*(\d+)\s*\)/);
      if(m) return { s:parseFloat(m[1]), o:parseInt(m[2]) };
      return null;
    }
    function parseVec2(str){
      if(!str) return null;
      const m = str.match(/Vector2\.new\s*\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/);
      if(m) return { x:parseFloat(m[1]), y:parseFloat(m[2]) };
      return null;
    }
    function parseColorSequence(block){
      const kps = [];
      const kpRx = /ColorSequenceKeypoint\.new\s*\(\s*([\d.]+)\s*,\s*(Color3\.[^\)]+\))\s*\)/g;
      let km;
      while((km = kpRx.exec(block)) !== null){
        const col = parseColor(km[2]);
        if(col) kps.push({ t:parseFloat(km[1]), color:col });
      }
      return kps;
    }

    // ── Apply a single key=value prop to an instance ──────────────
    function applyProp(inst, key, val){
      const p = inst.props;
      key = key.trim(); val = (val||'').trim();
      if(key === 'Parent'){
        // handled outside
        return;
      }
      if(key === 'BackgroundColor3'){ const c=parseColor(val); if(c) p.bg=c; return; }
      if(key === 'TextColor3'){ const c=parseColor(val); if(c) p.textColor=c; return; }
      if(key === 'BackgroundTransparency'){ p.bgTransparency=parseFloat(val); return; }
      if(key === 'TextTransparency'){ p.textTransparency=parseFloat(val); return; }
      if(key === 'ImageTransparency'){ p.imgTransparency=parseFloat(val); return; }
      if(key === 'Size'){ const u=parseUDim2(val); if(u) p.size=u; return; }
      if(key === 'Position'){ const u=parseUDim2(val); if(u) p.pos=u; return; }
      if(key === 'AnchorPoint'){ const v=parseVec2(val); if(v) p.anchor=v; return; }
      if(key === 'Text'){ const m=val.match(/^["'](.*)["']$/s); p.text=m?m[1]:val; return; }
      if(key === 'PlaceholderText'){ const m=val.match(/^["'](.*)["']$/s); p.placeholder=m?m[1]:''; return; }
      if(key === 'Name'){ const m=val.match(/^["'](.*)["']$/s); p.name=m?m[1]:val; return; }
      if(key === 'TextSize'){ p.textSize=parseInt(val); return; }
      if(key === 'Font'){ const m=val.match(/Enum\.Font\.(\w+)/); if(m) p.font=m[1]; return; }
      if(key === 'TextWrapped'){ p.textWrapped=(val==='true'); return; }
      if(key === 'TextScaled'){ p.textScaled=(val==='true'); return; }
      if(key === 'TextXAlignment'){ const m=val.match(/Enum\.TextXAlignment\.(\w+)/); if(m) p.textAlign=m[1].toLowerCase(); return; }
      if(key === 'TextYAlignment'){ const m=val.match(/Enum\.TextYAlignment\.(\w+)/); if(m) p.textVAlign=m[1].toLowerCase(); return; }
      if(key === 'Visible'){ p.visible=(val!=='false'); return; }
      if(key === 'ZIndex'){ p.zIndex=parseInt(val); return; }
      if(key === 'BorderSizePixel'){ p.borderSize=parseInt(val); return; }
      if(key === 'ClipsDescendants'){ p.clips=(val==='true'); return; }
      if(key === 'ScrollBarThickness'){ p.scrollBarThick=parseInt(val); return; }
      if(key === 'Image'){ const m=val.match(/["'](rbxassetid[^"']*)["']/) || val.match(/["'](rbxasset[^"']*)["']/) || val.match(/["'](https?[^"']*)["']/) ; if(m) p.image=m[1]; return; }
      if(key === 'Rotation'){ p.rotation=parseFloat(val); return; }
      // UICorner
      if(key === 'CornerRadius'){ const u=parseUDim(val); if(u) p.cornerRadius=u; return; }
      // UIStroke
      if(key === 'Thickness'){ p.thickness=parseFloat(val); return; }
      if(key === 'Color'){ const c=parseColor(val); if(c) p.strokeColor=c; return; }
      if(key === 'Transparency'){ p.strokeTransp=parseFloat(val); return; }
      // UIGradient
      if(key === 'Color' && val.includes('ColorSequence')){ p.colorSeq=parseColorSequence(val); return; }
      // UIPadding
      if(key.startsWith('Padding')){ const u=parseUDim(val); if(u) p[key]=u; return; }
      // UIListLayout
      if(key === 'FillDirection'){ const m=val.match(/Enum\.FillDirection\.(\w+)/); if(m) p.fillDirection=m[1]; return; }
      if(key === 'HorizontalAlignment'){ const m=val.match(/Enum\.HorizontalAlignment\.(\w+)/); if(m) p.hAlign=m[1]; return; }
      if(key === 'VerticalAlignment'){ const m=val.match(/Enum\.VerticalAlignment\.(\w+)/); if(m) p.vAlign=m[1]; return; }
      if(key === 'SortOrder'){ return; }
      if(key === 'Padding' && inst.type==='UIListLayout'){ const u=parseUDim(val); if(u) p.listPadding=u; return; }
      if(key === 'DisplayOrder'){ p.displayOrder=parseInt(val); return; }
    }

    // ── Parse a props table { k=v, k=v, ... } from a string ────────
    // Returns array of [key,value] pairs
    function parsePropsTable(body){
      const pairs = [];
      // We need to tokenize respecting nested parens/braces/strings
      let i=0, n=body.length;
      while(i<n){
        // skip whitespace & commas
        while(i<n && /[\s,]/.test(body[i])) i++;
        if(i>=n) break;
        // read key (identifier or [string])
        let key='';
        if(body[i]==='['){
          // skip bracketed key
          let depth=1; i++;
          while(i<n&&depth>0){ if(body[i]==='[')depth++;else if(body[i]===']')depth--;i++; }
          while(i<n&&body[i]!=='=') i++; i++;
          continue;
        }
        while(i<n && /[\w]/.test(body[i])){ key+=body[i]; i++; }
        if(!key){ i++; continue; }
        // skip whitespace + =
        while(i<n && /[\s=]/.test(body[i])) i++;
        // read value — respecting depth
        let val='', depth=0, inStr=false, strChar='';
        while(i<n){
          const c=body[i];
          if(!inStr && (c==='"'||c==="'")){ inStr=true; strChar=c; val+=c; i++; continue; }
          if(inStr && c===strChar && body[i-1]!=='\\'){ inStr=false; val+=c; i++; continue; }
          if(inStr){ val+=c; i++; continue; }
          if(c==='('||c==='{'||c==='['){ depth++; val+=c; i++; continue; }
          if(c===')'||c==='}'||c===']'){
            if(depth===0) break;
            depth--; val+=c; i++; continue;
          }
          if(c===',' && depth===0){ i++; break; }
          val+=c; i++;
        }
        if(key && val.trim()) pairs.push([key, val.trim()]);
      }
      return pairs;
    }

    // ── Pass 1a: Collect New("Type", { ... }) pattern ──────────────
    // Find all:  [local] varName = New("TypeName", { ... })
    //            [local] varName = Instance.new("TypeName")
    //            New("TypeName", { Parent=..., ... })  — anonymous
    const newHelperRx = /(?:(?:local\s+)?(\w+)\s*=\s*)?New\s*\(\s*["']([\w]+)["']\s*,\s*\{([^]*?)\}\s*(?:,\s*[\w.]+)?\s*\)/g;
    let m;
    while((m = newHelperRx.exec(code)) !== null){
      const varName = m[1] || newId();
      const instType = m[2];
      const propsBody = m[3] || '';

      if(!instances[varName]){
        instances[varName] = { type:instType, props:{}, varName };
        order.push(varName);
      } else {
        instances[varName].type = instType;
      }

      // Parse inline props
      const pairs = parsePropsTable(propsBody);
      for(const [k,v] of pairs){
        if(k === 'Parent'){
          // Extract parent varname
          const pv = v.trim().replace(/^[\w.]+$/,'');
          const cleanPv = v.trim().split('.')[0];
          parentOf[varName] = cleanPv;
        } else {
          applyProp(instances[varName], k, v);
        }
      }
    }

    // ── Pass 1b: Collect classic Instance.new("Type") ──────────────
    const instRx = /(?:local\s+)?(\w+)\s*=\s*Instance\.new\s*\(\s*["'](\w+)["']\s*\)/g;
    while((m = instRx.exec(code)) !== null){
      if(!instances[m[1]]){
        instances[m[1]] = { type:m[2], props:{}, varName:m[1] };
        order.push(m[1]);
      }
    }

    if(!order.length) return null;

    // ── Pass 2: Classic per-line property assignments ───────────────
    const codeLines = code.split('\n');
    for(const vn of order){
      const inst = instances[vn];
      for(const line of codeLines){
        const trim = line.trim();
        if(!trim.startsWith(vn + '.') && !trim.startsWith(vn + ' ')) continue;

        // .Parent = someVar
        const parentM = trim.match(new RegExp('^' + vn + '\\.Parent\\s*=\\s*(\\w+)'));
        if(parentM){ parentOf[vn] = parentM[1]; continue; }

        // Generic: varName.PropName = value
        const propM = trim.match(new RegExp('^' + vn + '\\.(\\w+)\\s*=\\s*(.+)$'));
        if(propM){ applyProp(inst, propM[1], propM[2]); }
      }
    }

    // ── Pass 3: Propagate modifier types to parent ──────────────────
    const MODIFIER_TYPES = new Set(['UICorner','UIGradient','UIStroke','UIPadding','UIListLayout','UITextSizeConstraint','UIAspectRatioConstraint','UISizeConstraint','UIScale']);
    for(const vn of order){
      const inst = instances[vn];
      const parentVar = parentOf[vn];
      if(!parentVar || !instances[parentVar]) continue;
      const parent = instances[parentVar];
      const pp = inst.props;

      if(inst.type === 'UICorner'){
        if(pp.cornerRadius) parent.props.cornerRadius = pp.cornerRadius;
        else parent.props.rounded = true;
      }
      else if(inst.type === 'UIGradient'){
        parent.props.gradient = pp;
      }
      else if(inst.type === 'UIStroke'){
        parent.props.stroke = pp;
      }
      else if(inst.type === 'UIPadding'){
        parent.props.uiPadding = pp;
      }
      else if(inst.type === 'UIListLayout'){
        parent.props.listLayout = pp;
      }
    }

    // ── Pass 4: Build parent→children map ──────────────────────────
    const children = {};
    for(const vn of order){
      const pv = parentOf[vn];
      if(pv){ if(!children[pv]) children[pv]=[]; children[pv].push(vn); }
    }

    // ── Utility functions ──────────────────────────────────────────
    function getBR(props){
      if(props.cornerRadius){
        const r=props.cornerRadius;
        if(r.s>=0.5) return '9999px';
        if(r.o>0) return r.o+'px';
      }
      if(props.rounded) return '8px';
      return '0';
    }
    function getGrad(gp){
      if(!gp||!gp.colorSeq||gp.colorSeq.length<2) return null;
      const rot=gp.rotation||0;
      const stops=gp.colorSeq.map(kp=>`${kp.color} ${Math.round(kp.t*100)}%`).join(', ');
      return `linear-gradient(${rot}deg,${stops})`;
    }
    const fontMap={
      GothamBold:'"DM Sans",system-ui',GothamBlack:'"Syne",system-ui',
      GothamMedium:'"DM Sans",system-ui',GothamSemibold:'"DM Sans",system-ui',
      Gotham:'"DM Sans",system-ui',Arial:'Arial,sans-serif',
      Code:'"JetBrains Mono",monospace',RobotoMono:'"JetBrains Mono",monospace',
      SourceSansPro:'sans-serif',Ubuntu:'sans-serif',Bodoni:'Georgia,serif',
      GothamBlack:'"Syne",system-ui',Fantasy:'fantasy',Arcade:'monospace',
    };
    function getFF(f){ return fontMap[f]||'system-ui,sans-serif'; }
    function getFW(f){ return f&&/(Bold|Black|Heavy)/.test(f)?'700':f&&/(Semi|Medium)/.test(f)?'600':'400'; }

    const CW=400, CH=520;
    function u2px(u,axis){
      if(!u) return null;
      const sc=axis==='x'?u.xs:u.ys, off=axis==='x'?u.xo:u.yo, cont=axis==='x'?CW:CH;
      return Math.round(sc*cont+off);
    }

    // ── Renderer ───────────────────────────────────────────────────
    // renderInst: cw/ch = container dimensions from parent (for UDim2 scale calc)
    function renderInst(vn, depth, cw, ch){
      cw = cw || CW; ch = ch || CH;
      const inst=instances[vn];
      if(!inst) return '';
      if(MODIFIER_TYPES.has(inst.type)) return '';
      const p=inst.props;
      if(p.visible===false) return '';

      // u2px using THIS element's container size
      function upx(u, axis){
        if(!u) return null;
        const sc = axis==='x'?u.xs:u.ys, off = axis==='x'?u.xo:u.yo;
        const cont = axis==='x'?cw:ch;
        return Math.round(sc*cont+off);
      }

      // Compute own pixel size (needed for children's container & AnchorPoint)
      let ownW = cw, ownH = ch;
      if(p.size){ const w=upx(p.size,'x'), h=upx(p.size,'y'); if(w>0) ownW=w; if(h>0) ownH=h; }

      const kids=(children[vn]||[])
        .filter(cn=>!MODIFIER_TYPES.has(instances[cn]?.type))
        .sort((a,b)=>((instances[a].props.zIndex||0)-(instances[b].props.zIndex||0)))
        .map(cn=>renderInst(cn, depth+1, ownW, ownH)).join('');

      const br=getBR(p);
      const grad=getGrad(p.gradient);
      const alpha=p.bgTransparency!=null?Math.max(0,1-p.bgTransparency):1;

      // Padding from UIPadding
      let pad='0';
      if(p.uiPadding){
        const pt=p.uiPadding.PaddingTop?.o||0, pb=p.uiPadding.PaddingBottom?.o||0;
        const pl=p.uiPadding.PaddingLeft?.o||0,  pr=p.uiPadding.PaddingRight?.o||0;
        pad=`${pt}px ${pr}px ${pb}px ${pl}px`;
      }

      // Size + Position (calculated over THIS element's container = parent size)
      let sizeS='', posS='';
      if(p.size){
        const w=upx(p.size,'x'), h=upx(p.size,'y');
        if(w!=null) sizeS+=`width:${Math.max(1,w)}px;`;
        if(h!=null) sizeS+=`height:${Math.max(1,h)}px;`;
      }
      if(p.pos && depth>0){
        let l=upx(p.pos,'x'), t=upx(p.pos,'y');
        // AnchorPoint compensation
        if(p.anchor){
          const pw=upx(p.size,'x')||0, ph=upx(p.size,'y')||0;
          if(l!=null) l=l-Math.round(p.anchor.x*pw);
          if(t!=null) t=t-Math.round(p.anchor.y*ph);
        }
        if(l!=null) posS=`position:absolute;left:${l}px;top:${t!=null?t:0}px;`;
      }

      // Stroke
      let strokeS='';
      if(p.stroke){
        const sw=p.stroke.thickness||1.5;
        const sc=p.stroke.strokeColor||(p.stroke.strokeTransp!=null?`rgba(255,255,255,${1-p.stroke.strokeTransp})`:'rgba(255,255,255,.25)');
        strokeS=`outline:${sw}px solid ${sc};outline-offset:-${sw}px;`;
      }

      // List layout
      let layoutS='';
      if(p.listLayout){
        const horiz=p.listLayout.fillDirection==='Horizontal';
        const gpx=p.listLayout.listPadding?.o||4;
        const halign=p.listLayout.hAlign?.toLowerCase()==='center'?'center':'flex-start';
        layoutS=`display:flex;flex-direction:${horiz?'row':'column'};gap:${gpx}px;align-items:${halign};flex-wrap:wrap;`;
      }

      // posS already sets position:absolute when needed.
      const posType = posS ? 'position:absolute;' : 'position:relative;';
      // Clip: Frame/Button clips by default (for border-radius), TextLabel/etc no clip
      const shouldClip = ['Frame','TextButton','ScrollingFrame','BillboardGui','ViewportFrame','ImageButton'].includes(inst.type) || p.clips;
      const clipS = shouldClip ? 'overflow:hidden;' : 'overflow:visible;';
      const baseS=`box-sizing:border-box;${posType}${clipS}${br?'border-radius:'+br+';':''}${strokeS}${layoutS}`;

      // ── ScreenGui (transparent full-size shell) ──
      // Renderiza a tamaño real CW×CH. El contenedor externo tiene overflow:hidden
      // y height explícito para que nada quede invisible. Sin JS, sin IDs dinámicos.
      if(inst.type==='ScreenGui'){
        return `<div style="box-sizing:border-box;position:relative;width:100%;height:${CH}px;overflow:hidden;background:transparent;"><div style="box-sizing:border-box;position:absolute;top:0;left:50%;transform:translateX(-50%);width:${CW}px;height:${CH}px;overflow:visible;">${kids}</div></div>`;
      }

      // ── Frame / ScrollingFrame / BillboardGui / ViewportFrame ──
      if(['Frame','ScrollingFrame','BillboardGui','ViewportFrame'].includes(inst.type)){
        let bg=alpha<0.02?'transparent':(p.bg||'rgba(20,18,36,.96)');
        if(grad&&alpha>0.02) bg=grad;
        const opacS=alpha<0.99&&alpha>0?`opacity:${alpha.toFixed(2)};`:'';
        return `<div style="${baseS}${posS}${sizeS}background:${bg};padding:${pad};${opacS}">${kids}</div>`;
      }

      // ── TextLabel ──
      if(inst.type==='TextLabel'){
        const bgT=p.bgTransparency==null?0:p.bgTransparency;
        const bg=bgT>=1?'transparent':(p.bg||'transparent');
        const tc=p.textColor||'#f5f5fa';
        const ta=p.textAlign==='center'?'center':p.textAlign==='right'?'right':'left';
        const fs=Math.min(p.textSize||13,24);
        const fw=getFW(p.font); const ff=getFF(p.font);
        const talpha=p.textTransparency!=null?Math.max(0,1-p.textTransparency):1;
        const wrapS=p.textWrapped||p.textScaled
          ?'white-space:normal;word-break:break-word;overflow:hidden;'
          :'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        return `<div style="${baseS}${posS}${sizeS}background:${bg};color:${tc};font-size:${fs}px;`+
          `line-height:${Math.round(fs*1.4)}px;font-family:${ff};font-weight:${fw};`+
          `text-align:${ta};padding:${pad||'3px 8px'};${wrapS}opacity:${talpha};">`+
          `${_escHtml(p.text||p.name||'')}</div>`;
      }

      // ── TextButton / ImageButton ──
      if(inst.type==='TextButton'||inst.type==='ImageButton'){
        const bgT=p.bgTransparency==null?0:p.bgTransparency;
        const bg=bgT>=1?'transparent':(grad||p.bg||'#7c8cff');
        const tc=p.textColor||'#fff';
        const fs=Math.min(p.textSize||13,20);
        const fw=getFW(p.font); const ff=getFF(p.font);
        const br2=br||'8px';
        const lbl=inst.type==='ImageButton'?(p.text||''):(p.text||p.name||'Button');
        const bgAlpha=bgT>=1?0:Math.max(0,1-bgT);
        return `<button`+
          ` onclick="this.style.transform='scale(.95)';this.style.filter='brightness(1.2)';setTimeout(()=>{this.style.transform='';this.style.filter=''},120)"`+
          ` onmouseenter="this.style.filter='brightness(1.1)'" onmouseleave="this.style.filter=''"`+
          ` style="${baseS}${posS}${sizeS}background:${bg};color:${tc};font-size:${fs}px;`+
          `font-family:${ff};font-weight:${fw};border:none;cursor:pointer;border-radius:${br2};`+
          `padding:${pad||'7px 14px'};opacity:${bgAlpha};transition:transform .1s,filter .1s;`+
          `text-align:center;display:block;">${_escHtml(lbl)}${kids}</button>`;
      }

      // ── TextBox ──
      if(inst.type==='TextBox'){
        const bg=p.bg||'rgba(255,255,255,.07)';
        const tc=p.textColor||'#fff';
        const fs=Math.min(p.textSize||13,18);
        const br2=br||'6px';
        return `<input type="text" placeholder="${_escHtml(p.placeholder||p.text||'')}"`+
          ` style="${posS}${sizeS}box-sizing:border-box;background:${bg};color:${tc};`+
          `font-size:${fs}px;border:1px solid rgba(255,255,255,.2);border-radius:${br2};`+
          `padding:${pad||'6px 10px'};outline:none;"/>`;
      }

      // ── ImageLabel ──
      if(inst.type==='ImageLabel'){
        const bgT=p.bgTransparency==null?0:p.bgTransparency;
        const bg=bgT>=1?'transparent':(grad||p.bg||'rgba(255,255,255,.06)');
        const iAlpha=p.imgTransparency!=null?Math.max(0,1-p.imgTransparency):1;
        return `<div style="${baseS}${posS}${sizeS}background:${bg};padding:${pad};`+
          `display:flex;align-items:center;justify-content:center;min-height:28px;`+
          `font-size:1.2rem;opacity:${iAlpha};">🖼${kids}</div>`;
      }

      // ── Unknown type with children ──
      if(kids) return `<div style="${posS}${sizeS}position:relative;overflow:hidden;">${kids}</div>`;
      return '';
    }

    // ── Find root elements ─────────────────────────────────────────
    // Roots: elements whose parent is a Roblox service (not in instances)
    // OR has no parent at all.
    // Children of ScreenGui are NOT roots — they render as ScreenGui's children.
    const serviceNames = new Set([
      'PlayerGui','CoreGui','Workspace','game','player','playerGui',
      'LocalPlayer','StarterGui','StarterPlayerScripts',
      // Variables comunes que apuntan a servicios Roblox
      'Players','ReplicatedStorage','ServerStorage','Lighting',
      'SoundService','DataStoreService','HttpService','RunService',
      'UserInputService','PathfindingService','CollectionService',
      // Variables locales típicas que guardan playerGui
      'screenGuiParent','guiParent','gui','PlayerGui','CoreGui'
    ]);
    const roots = order.filter(vn => {
      if(MODIFIER_TYPES.has(instances[vn].type)) return false;
      const pv = parentOf[vn];
      // No parent defined → root
      if(!pv) return true;
      // Parent is a known Roblox service (external) → root
      if(serviceNames.has(pv)) return true;
      // Parent var exists in instances → NOT a root (it's a child)
      if(instances[pv]) return false;
      // Parent var not in instances but not a known service → treat as root
      return true;
    });

    // Prefer ScreenGui → fallback to first visible Frame → fallback to anything
    const mainRoot = roots.find(vn=>instances[vn].type==='ScreenGui')
                  || roots.find(vn=>instances[vn].type==='Frame')
                  || roots.find(vn=>instances[vn].props.visible!==false)
                  || roots[0];

    if(!mainRoot) return null;

    const previewHTML = renderInst(mainRoot, 0);
    const allTypes = [...new Set(order.map(vn=>instances[vn].type).filter(t=>!MODIFIER_TYPES.has(t)))];

    return { html:previewHTML, count:order.length, types:allTypes };
  }




  // ── RUNNER PRINCIPAL LUAU/LUA ──────────────────────────────────
  function _runLuau(code, visId, consoleEl) {
    _cline(consoleEl,'info','▸ Ejecutando Lua/Luau…');

    // 1. Análisis sintáctico con sugerencias DevTools
    const {errors:lintErrors, warnings:lintWarnings}=_luaLint(code, consoleEl, true);

    // 2. Intérprete: obtiene outputs y variables
    const {outputs, vars}=_luaInterp(code, consoleEl, true);

    // 3. Imprime outputs en consola
    if(outputs.length>0){
      outputs.forEach(o=>_cline(consoleEl, o.type||'log', o.text, o.ln));
    }

    // 4. UI Preview
    const vis=document.getElementById(visId);
    const hasInstance=/Instance\.new\s*\(/.test(code);

    if(vis){
      if(hasInstance){
        const uiResult=_buildRobloxUI(code, vars);
        if(uiResult&&uiResult.html){
          // Output console
          _cline(consoleEl,'ok',`✅ ${uiResult.count} instancias detectadas: ${uiResult.types.join(', ')}`);

          vis.innerHTML=`
<div style="background:linear-gradient(160deg,#0d1b2a 0%,#1b2838 55%,#162033 100%);min-height:280px;position:relative;overflow:hidden;border-radius:0 0 var(--r) var(--r)">
  <!-- Grid Roblox Studio -->
  <div style="position:absolute;inset:0;opacity:.04;background-image:linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px);background-size:24px 24px"></div>
  <!-- Barra superior Studio -->
  <div style="position:absolute;top:0;left:0;right:0;height:26px;background:rgba(0,0,0,.5);display:flex;align-items:center;padding:0 10px;gap:8px;border-bottom:1px solid rgba(255,255,255,.07)">
    <div style="width:10px;height:10px;border-radius:50%;background:#ff5f57;margin-right:2px"></div>
    <div style="width:10px;height:10px;border-radius:50%;background:#febc2e"></div>
    <div style="width:10px;height:10px;border-radius:50%;background:#28c840"></div>
    <span style="font-size:.62rem;color:rgba(255,255,255,.3);margin-left:6px;font-family:monospace">Roblox Studio — UI Preview</span>
    <span style="margin-left:auto;font-size:.6rem;color:rgba(255,255,255,.25)">${uiResult.count} inst.</span>
  </div>
  <!-- Área de preview -->
  <div style="position:absolute;top:26px;left:0;right:0;bottom:0;display:flex;align-items:flex-start;justify-content:center;padding:12px;overflow-y:auto">
    <div style="background:rgba(0,0,0,.2);border-radius:10px;overflow:visible;width:100%;max-width:420px;box-shadow:0 8px 32px rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.08)">
      ${uiResult.html}
    </div>
  </div>
</div>`;
        } else {
          vis.innerHTML=_noUIHTML('Instance.new detectado pero sin Frame/GUI visible');
        }
      } else {
        // Sin UI — muestra output de print en preview también
        const printLines=outputs.filter(o=>o.type==='log'||o.type==='warn');
        if(printLines.length){
          vis.innerHTML=`
<div style="background:linear-gradient(160deg,#0a0f1a,#0d1520);min-height:200px;border-radius:0 0 var(--r) var(--r);overflow:hidden">
  <div style="padding:8px 14px;background:rgba(0,0,0,.4);font-size:.65rem;color:rgba(255,255,255,.3);font-family:monospace;border-bottom:1px solid rgba(0,230,118,.1);display:flex;align-items:center;gap:6px">
    <span style="color:#00e676">●</span> Lua Output
  </div>
  <div style="padding:10px 14px;font-family:'JetBrains Mono','Fira Code',monospace;font-size:.82rem;line-height:1.8">
    ${printLines.map(o=>`<div style="color:${o.type==='warn'?'#f5a623':'#b8f0c8'}"><span style="color:rgba(255,255,255,.25);margin-right:8px">›</span>${_escHtml(o.text)}</div>`).join('')}
  </div>
</div>`;
          _cline(consoleEl,'ok',`✅ Lua — ${printLines.length} output(s), ${lintErrors.length} error(es), ${lintWarnings.length} aviso(s)`);
        } else {
          vis.innerHTML=_noUIHTML('Sin Instance.new() ni print() — escribe código Lua para ver output');
          if(!lintErrors.length) _cline(consoleEl,'info','Sin output detectable — añade print() o Instance.new()');
        }
      }
    }

    // Si hay errores de lint, mostrar resumen
    if(lintErrors.length){
      _cline(consoleEl,'err',`${lintErrors.length} error(es) de sintaxis encontrado(s)`);
    }
  }

  function _noUIHTML(msg){
    return `<div style="background:linear-gradient(160deg,#0d1b2a,#1b2838);min-height:200px;position:relative;overflow:hidden;border-radius:0 0 var(--r) var(--r);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:rgba(255,255,255,.3);font-size:.8rem;text-align:center;padding:20px">
      <span style="font-size:2.2rem">🎮</span>
      <span>${_escHtml(msg)}</span>
      <span style="font-size:.7rem;margin-top:4px;max-width:280px;line-height:1.5">Usa Instance.new("Frame"), TextButton, TextLabel... para ver la UI renderizada</span>
    </div>`;
  }

  // ══════════════════════════════════════════════════════════════
  //  RUNNER SIMULADO (Python, Java, C++, etc.) — mejorado
  // ══════════════════════════════════════════════════════════════
  function _runSim(code, lang, consoleEl) {
    _cline(consoleEl,'info',`▸ Ejecutando ${LANGUAGES.find(l=>l.id===lang)?.label||lang}…`);
    const lines=code.split('\n');

    // ── Análisis de errores por lenguaje ──
    const LINT_RULES={
      python:[
        {rx:/\bvar\s+\w+/,msg:'Python no usa "var". Solo escribe: nombre = valor',hint:'Python es de tipado dinámico, no declaras el tipo.'},
        {rx:/;$/,msg:'Python no usa ";" al final de línea',hint:'Simplemente omite el punto y coma.'},
        {rx:/^\s*\/\//,msg:'Los comentarios en Python usan "#", no "//"',hint:'Cambia "//" por "#" para comentar código.'},
        {rx:/!==/,msg:'"!==" no existe en Python, usa "!="',hint:'Python no tiene "!==" ni "===", solo "!=" y "==".'},
      ],
      java:[
        {rx:/def\s+\w+/,msg:'Java no usa "def". Usa "public void nombreMetodo()"',hint:'En Java los métodos llevan modificador, tipo y nombre.'},
        {rx:/print\s*\(/,msg:'En Java usa System.out.println() en lugar de print()',hint:'print() es de Python. En Java es System.out.println("texto");'},
      ],
      cpp:[
        {rx:/println|System\.out/,msg:'C++ no tiene println/System.out. Usa std::cout << "texto" << std::endl;',hint:'C++ usa streams de la biblioteca <iostream>.'},
      ],
      csharp:[
        {rx:/\bdef\s+/,msg:'C# no usa "def". Usa "void NombreMetodo()"',hint:'Los métodos en C# tienen modificador de acceso y tipo de retorno.'},
      ],
      php:[
        {rx:/\bprint\s*\(/,msg:'En PHP usa "echo" en lugar de print() para output',hint:'echo "texto"; es la forma estándar en PHP.'},
      ],
    };

    const rules=LINT_RULES[lang]||[];
    let errorCount=0;
    lines.forEach((rawLine,i)=>{
      const stripped=rawLine.replace(/#.*$/,'').replace(/\/\/.*$/,'').trim();
      rules.forEach(rule=>{
        if(rule.rx.test(rawLine)){
          _cline(consoleEl,'warn',rule.msg, i+1, rule.hint);
          errorCount++;
        }
      });
    });

    if(lang==='sql'){
      const tables=(code.match(/CREATE\s+TABLE\s+(\w+)/gi)||[]).map(m=>m.replace(/CREATE\s+TABLE\s+/i,''));
      const inserts=code.match(/INSERT\s+INTO/gi)||[];
      const selects=code.match(/SELECT\s+.+?(?=\s*;|\s*\n\s*\n|$)/gis)||[];
      if(tables.length) tables.forEach(t=>_cline(consoleEl,'ok','✓ Tabla creada: '+t));
      if(inserts.length) _cline(consoleEl,'ok',`✓ ${inserts.length} INSERT(s)`);
      if(selects.length){
        _cline(consoleEl,'info','┌─ Resultado SELECT ─────────────────');
        _cline(consoleEl,'log','│ '+selects[selects.length-1].replace(/\s+/g,' ').slice(0,90));
        _cline(consoleEl,'info','└─ (output simulado)');
      }
      _cline(consoleEl,'ok','✅ SQL ejecutado');
      return;
    }

    // Patrones de output por lenguaje
    const pats={
      python:/^\s*print\s*\(\s*(.*?)\s*\)\s*$/gm,
      java:/System\.out\.print(?:ln)?\s*\(\s*(.*?)\s*\)/g,
      csharp:/Console\.Write(?:Line)?\s*\(\s*(.*?)\s*\)/g,
      cpp:/cout\s*<<\s*(.*?)(?:<<\s*(?:endl|"\\n"|'\n'))?;/g,
      kotlin:/println\s*\(\s*(.*?)\s*\)/g,
      swift:/print\s*\(\s*(.*?)\s*\)/g,
      go:/fmt\.Print(?:ln|f)?\s*\(\s*(.*?)\s*(?:,.*?)?\)/g,
      rust:/println!\s*\(\s*"([^"]+)"/g,
      ruby:/\b(?:puts|p)\s+(.*?)$/gm,
      php:/echo\s+(.*?);/g,
      bash:/echo\s+(.*?)$/gm,
      r:/(?:print|cat)\s*\(\s*(.*?)\s*\)/g,
      dart:/print\s*\(\s*(.*?)\s*\)/g,
    };

    const pat=pats[lang];
    const outs=[];
    if(pat){
      pat.lastIndex=0;
      let m;
      while((m=pat.exec(code))!==null){
        let val=(m[1]||'').trim()
          .replace(/^["'`]|["'`]$/g,'')  // quita comillas externas
          .replace(/\\n/g,'\n').replace(/\\t/g,'\t');
        if(val) outs.push(val);
      }
    }

    if(!outs.length){
      _cline(consoleEl,'info','▸ Sin output detectado');
      _cline(consoleEl,'hint','Usa la función de output de tu lenguaje:');
      const examples={python:'print("Hola")',java:'System.out.println("Hola");',
        csharp:'Console.WriteLine("Hola");',cpp:'std::cout << "Hola" << std::endl;',
        kotlin:'println("Hola")',swift:'print("Hola")',go:'fmt.Println("Hola")',
        rust:'println!("Hola");',ruby:'puts "Hola"',php:'echo "Hola";',
        bash:'echo "Hola"',r:'print("Hola")',dart:'print("Hola");'};
      if(examples[lang]) _cline(consoleEl,'hint',`  → ${examples[lang]}`);
    } else {
      outs.forEach(o=>_cline(consoleEl,'log',o));
    }

    const lbl=LANGUAGES.find(l=>l.id===lang)?.label||lang;
    _cline(consoleEl,'ok',`✅ ${lbl} — ${outs.length} output(s)${errorCount?`, ${errorCount} aviso(s)`:''}`)
  }

  function _langOpts(sel='js'){
    const grps={};
    LANGUAGES.forEach(l=>{ if(!grps[l.group]) grps[l.group]=[]; grps[l.group].push(l); });
    return Object.entries(grps).map(([g,ls])=>
      `<optgroup label="${g}">${ls.map(l=>`<option value="${l.id}"${l.id===sel?' selected':''}>${l.label}</option>`).join('')}</optgroup>`
    ).join('');
  }

  function detectLang(html){
    if(!html) return 'js';
    const t=html.toLowerCase();
    if(/language-luau|roblox|playerGui|workspace:|game:GetService/.test(t)) return 'luau';
    if(/language-lua\b|io\.read|pairs\(|ipairs\(/.test(t)&&!/roblox/i.test(t)) return 'lua';
    if(/language-python|def |print\(|import |elif /.test(t)) return 'python';
    if(/language-java(?!script)|public class|system\.out/.test(t)) return 'java';
    if(/language-html|<!doctype|<html/.test(t)) return 'html';
    if(/language-sql|select |create table|insert into/.test(t)) return 'sql';
    if(/language-cpp|#include|cout <<|int main/.test(t)) return 'cpp';
    if(/language-csharp|console\.writeline|using system/.test(t)) return 'csharp';
    if(/language-rust|fn main|let mut|println!/.test(t)) return 'rust';
    if(/language-go\b|func main|fmt\.println/.test(t)) return 'go';
    if(/language-react|jsx|usestate/.test(t)) return 'react';
    if(/language-typescript|interface |: string|: number/.test(t)) return 'typescript';
    if(/language-bash|#!/.test(t)) return 'bash';
    if(/language-ruby|def |puts |end\b/.test(t)&&/ruby/.test(t)) return 'ruby';
    if(/<[a-z]+[\s>]/.test(t)) return 'html';
    return 'js';
  }

  function extractCode(html){
    if(!html) return '';
    const d=document.createElement('div'); d.innerHTML=html;
    const pre=d.querySelector('pre code, pre, code');
    return (pre?pre.textContent:d.textContent)||'';
  }

  function buildPlayground(blockId, blockContent){
    const lang=detectLang(blockContent);
    const code=extractCode(blockContent)||STARTERS[lang]||'// Escribe tu código aquí\nconsole.log("¡Hola, mundo!");';
    const pgId=`pg_${blockId}`;
    const col=LANG_COLORS[lang]||'#7c8cff';
    const isLuaLike=lang==='luau'||lang==='lua'||lang==='gdscript';
    const isWeb=lang==='html'||lang==='css'||lang==='react'||lang==='js';
    const previewLabel=isLuaLike?'🎮 UI Preview':isWeb?'🌐 Preview':'👁 Output';
    const escaped=code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    return `<div class="code-playground" id="${pgId}" data-lang="${lang}">
  <div class="pg-tabs">
    <button class="pg-tab active" onclick="PG.switchTab('${pgId}','code')" id="${pgId}_tab_code">⌨ Código</button>
    <button class="pg-tab" onclick="PG.switchTab('${pgId}','preview')" id="${pgId}_tab_preview">${previewLabel}</button>
    <button class="pg-tab" onclick="PG.switchTab('${pgId}','console')" id="${pgId}_tab_console">🖥 Consola</button>
  </div>

  <div class="pg-panel active" id="${pgId}_code">
    <div class="pg-toolbar">
      <div class="pg-lang-badge" id="${pgId}_lbadge" style="background:${col}22;color:${col};border:1px solid ${col}44">${lang}</div>
      <select class="pg-lang-sel" id="${pgId}_lang" onchange="PG.changeLang('${pgId}',this.value)">${_langOpts(lang)}</select>
      <button class="pg-run-btn" onclick="PG.run('${pgId}')">▶ Ejecutar <kbd style="opacity:.7;font-size:.65rem;margin-left:4px">Ctrl+↵</kbd></button>
      <button class="pg-copy-btn" onclick="PG.copyCode('${pgId}')">📋 Copiar</button>
      <button class="pg-clear-btn" onclick="PG.clearCode('${pgId}')">↺ Reset</button>
      <button class="pg-clear-btn" onclick="PG.loadFromURL('${pgId}')" title="Cargar desde URL (GitHub raw, etc.)">🔗 URL</button>
      <button class="pg-clear-btn" onclick="PG.formatCode('${pgId}')" title="Formatear código">⇥ Format</button>
      <span class="pg-status" id="${pgId}_status">Listo</span>
    </div>
    <div class="pg-editor-wrap" style="display:flex;min-height:200px;max-height:480px;overflow:hidden">
      <div class="pg-gutter" id="${pgId}_gutter" style="width:40px;background:rgba(0,0,0,.4);color:var(--t2);font-family:var(--fm);font-size:.84rem;line-height:1.7;padding:14px 8px 14px 4px;text-align:right;user-select:none;overflow:hidden;border-right:1px solid var(--b1);flex-shrink:0">${code.split('\n').map((_,i)=>`<div>${i+1}</div>`).join('')}</div>
      <div style="flex:1;position:relative;overflow:auto;min-height:200px" id="${pgId}_scroll">
        <div class="pg-highlight" id="${pgId}_hl" aria-hidden="true" style="position:absolute;top:0;left:0;padding:14px 16px;font-family:var(--fm);font-size:.84rem;line-height:1.7;pointer-events:none;white-space:pre;min-width:100%;color:#e8eaf6;z-index:1">${_hl(code,lang)}</div>
        <textarea class="pg-editor" id="${pgId}_editor" spellcheck="false"
          style="position:relative;display:block;width:100%;min-width:100%;padding:14px 16px;background:transparent;color:transparent;caret-color:#aabbff;font-family:var(--fm);font-size:.84rem;line-height:1.7;border:none;outline:none;resize:none;tab-size:2;white-space:pre;z-index:2;-webkit-text-fill-color:transparent;overflow:hidden;min-height:200px"
          oninput="PG.syncEditor('${pgId}');PG.syncScroll('${pgId}')"
          onscroll="PG.syncScroll('${pgId}')"
          onkeydown="PG.handleKey(event,'${pgId}')">${escaped}</textarea>
      </div>
    </div>
  </div>

  <div class="pg-panel" id="${pgId}_preview">
    <div class="pg-toolbar">
      <span style="font-size:.75rem;color:var(--t1)">▸ Ejecuta el código para ver el resultado</span>
      <button class="pg-run-btn" onclick="PG.run('${pgId}')" style="margin-left:auto">▶ Ejecutar</button>
    </div>
    ${isLuaLike
      ? `<div id="${pgId}_vis" style="min-height:240px;background:linear-gradient(160deg,#0d1b2a,#1b2838);position:relative;overflow:hidden"><div style="display:flex;align-items:center;justify-content:center;height:240px;color:rgba(255,255,255,.3);font-size:.85rem;flex-direction:column;gap:8px"><span style="font-size:2rem">🎮</span><span>Ejecuta el script para ver la UI preview</span></div></div>`
      : isWeb
        ? `<div style="background:#fff;min-height:240px;max-height:480px;overflow:hidden"><iframe id="${pgId}_iframe" style="width:100%;height:420px;border:none" sandbox="allow-scripts allow-same-origin allow-forms"></iframe></div>`
        : `<div id="${pgId}_simout" style="padding:20px;background:var(--g0);min-height:180px"><div style="color:var(--t2);font-size:.82rem;text-align:center;padding:40px 0">▶ Ejecuta para ver el output aquí</div></div>`
    }
  </div>

  <div class="pg-panel" id="${pgId}_console">
    <div class="pg-toolbar">
      <span style="font-size:.75rem;color:var(--t1)">🖥 Consola</span>
      <button class="pg-clear-btn" onclick="PG.clearConsole('${pgId}')" style="margin-left:auto">Limpiar</button>
    </div>
    <div class="pg-console" id="${pgId}_console"><div class="pg-empty">— Ejecuta el código para ver el output —</div></div>
  </div>
</div>`;
  }

  return {
    buildPlayground, detectLang, extractCode,

    syncEditor(pgId){
      const ed=document.getElementById(`${pgId}_editor`);
      const hl=document.getElementById(`${pgId}_hl`);
      const gut=document.getElementById(`${pgId}_gutter`);
      const lang=document.getElementById(`${pgId}_lang`)?.value||'js';
      if(!ed||!hl) return;
      const code=ed.value;
      hl.innerHTML=_hl(code,lang);
      if(gut) gut.innerHTML=code.split('\n').map((_,i)=>`<div>${i+1}</div>`).join('');
      // Resize textarea to match content so scroll container handles overflow
      const lines=code.split('\n').length;
      const lineH=Math.round(parseFloat(getComputedStyle(ed).lineHeight)||23.8);
      const pad=28; // 14px top + 14px bottom
      const newH=Math.max(200,lines*lineH+pad);
      ed.style.height=newH+'px';
      hl.style.minHeight=newH+'px';
    },

    syncScroll(pgId){
      const sc=document.getElementById(`${pgId}_scroll`);
      const hl=document.getElementById(`${pgId}_hl`);
      const gut=document.getElementById(`${pgId}_gutter`);
      if(sc&&hl){ hl.style.top=sc.scrollTop+'px'; hl.style.left=sc.scrollLeft+'px'; }
      if(sc&&gut){ gut.scrollTop=sc.scrollTop; }
    },

    switchTab(pgId,tab){
      ['code','preview','console'].forEach(t=>{
        document.getElementById(`${pgId}_${t}`)?.classList.toggle('active',t===tab);
        document.getElementById(`${pgId}_tab_${t}`)?.classList.toggle('active',t===tab);
      });
    },

    changeLang(pgId, lang){
      const ed=document.getElementById(`${pgId}_editor`);
      const badge=document.getElementById(`${pgId}_lbadge`);
      const prevTab=document.getElementById(`${pgId}_tab_preview`);
      if(!ed) return;
      const col=LANG_COLORS[lang]||'#7c8cff';
      if(badge){ badge.textContent=lang; badge.style.color=col; badge.style.background=col+'22'; badge.style.borderColor=col+'44'; }
      const isLua=lang==='luau'||lang==='lua'||lang==='gdscript';
      const isWeb=lang==='html'||lang==='css'||lang==='react'||lang==='js';
      if(prevTab) prevTab.textContent=isLua?'🎮 UI Preview':isWeb?'🌐 Preview':'👁 Output';
      const pg=document.getElementById(pgId);
      if(pg) pg.dataset.lang=lang;
      // Load starter if editor is mostly default
      const cur=ed.value.trim();
      const isDefault=Object.values(STARTERS).some(s=>s.trim()===cur)||cur.startsWith('//');
      if(STARTERS[lang]&&isDefault) ed.value=STARTERS[lang];
      this.syncEditor(pgId);
    },

    handleKey(e, pgId){
      if(e.key==='Tab'){
        e.preventDefault();
        const ta=e.target, s=ta.selectionStart, end=ta.selectionEnd;
        if(e.shiftKey){
          // Unindent
          const line=ta.value.lastIndexOf('\n',s-1)+1;
          if(ta.value.slice(line,line+2)==='  '){ ta.value=ta.value.slice(0,line)+ta.value.slice(line+2); ta.selectionStart=ta.selectionEnd=Math.max(line,s-2); }
        } else {
          ta.value=ta.value.slice(0,s)+'  '+ta.value.slice(end);
          ta.selectionStart=ta.selectionEnd=s+2;
        }
        this.syncEditor(pgId);
      }
      if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){ e.preventDefault(); this.run(pgId); }
    },

    run(pgId){
      const langSel=document.getElementById(`${pgId}_lang`);
      const ed=document.getElementById(`${pgId}_editor`);
      const status=document.getElementById(`${pgId}_status`);
      const consoleEl=document.getElementById(`${pgId}_console`);
      if(!ed||!langSel) return;
      const lang=langSel.value;
      const code=ed.value;
      if(consoleEl) consoleEl.innerHTML='';
      if(status){ status.className='pg-status run'; status.textContent='Ejecutando…'; }
      const isLua=lang==='luau'||lang==='lua'||lang==='gdscript';
      const isWeb=lang==='html'||lang==='css'||lang==='react'||lang==='js';
      try{
        if(isLua){
          this.switchTab(pgId,'preview');
          _runLuau(code,`${pgId}_vis`,consoleEl);
        } else if(isWeb){
          this.switchTab(pgId,lang==='js'?'preview':'preview');
          _runHTML(code,lang,`${pgId}_iframe`,consoleEl);
          if(lang==='js') setTimeout(()=>this.switchTab(pgId,'console'),400);
        } else {
          this.switchTab(pgId,'console');
          _runSim(code,lang,consoleEl);
        }
        if(status){ status.className='pg-status ok'; status.textContent='✓ OK'; }
      }catch(err){
        _cline(consoleEl,'err','Error: '+err.message);
        if(status){ status.className='pg-status err'; status.textContent='⚠ Error'; }
      }
    },

    copyCode(pgId){
      const ed=document.getElementById(`${pgId}_editor`);
      if(ed) navigator.clipboard.writeText(ed.value).then(()=>Toast.success('Código copiado'));
    },

    clearCode(pgId){
      const ed=document.getElementById(`${pgId}_editor`);
      const lang=document.getElementById(`${pgId}_lang`)?.value||'js';
      if(!ed) return;
      ed.value=STARTERS[lang]||'';
      this.syncEditor(pgId);
    },

    clearConsole(pgId){
      const c=document.getElementById(`${pgId}_console`);
      if(c) c.innerHTML='<div class="pg-empty">— Consola limpiada —</div>';
    },

    async loadFromURL(pgId){
      const url=await _promptInline('URL del script (raw GitHub, pastebin, etc.):','https://raw.githubusercontent.com/...');
      if(!url) return;
      const status=document.getElementById(`${pgId}_status`);
      if(status){status.className='pg-status run';status.textContent='Descargando…';}
      try{
        const res=await fetch(url);
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const code=await res.text();
        const ed=document.getElementById(`${pgId}_editor`);
        if(ed){
          ed.value=code;
          // Auto-detect language from URL extension
          const ext=url.split('.').pop().toLowerCase();
          const extMap={lua:'lua',luau:'luau',js:'js',py:'python',java:'java',ts:'typescript',html:'html',css:'css',rb:'ruby',go:'go',rs:'rust',cpp:'cpp',cs:'csharp',php:'php',sh:'bash',sql:'sql'};
          const detectedLang=extMap[ext];
          if(detectedLang){
            const sel=document.getElementById(`${pgId}_lang`);
            if(sel){sel.value=detectedLang;this.changeLang(pgId,detectedLang);}
          }
          this.syncEditor(pgId);
          if(status){status.className='pg-status ok';status.textContent='✓ Cargado';}
          Toast.success(`Script cargado (${code.split('\\n').length} líneas)`);
        }
      }catch(err){
        if(status){status.className='pg-status err';status.textContent='⚠ Error';}
        Toast.error('No se pudo cargar: '+err.message+' (verifica CORS — usa raw.githubusercontent.com)');
      }
    },

    formatCode(pgId){
      const ed=document.getElementById(`${pgId}_editor`);
      if(!ed) return;
      let code=ed.value;
      // Basic indentation cleanup
      const lines=code.split('\n');
      let indent=0;
      const formatted=lines.map(line=>{
        const t=line.trim();
        if(!t) return '';
        // Decrease indent for closing tokens
        if(/^(end\b|}\s*$|\)\s*$|else\b|elseif\b|elif |except|finally:|catch)/.test(t)) indent=Math.max(0,indent-1);
        const result='  '.repeat(indent)+t;
        // Increase indent after opening tokens
        if(/(\bdo\b|\bthen\b|\bfunction\b.*\)$|\{$|\($|:\s*$|\belse\b$)/.test(t) && !/end$/.test(t)) indent++;
        return result;
      });
      ed.value=formatted.join('\n');
      this.syncEditor(pgId);
      Toast.success('Código formateado');
    }
  };
})();

