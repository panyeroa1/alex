
import { FunctionDeclaration, Type } from '@google/genai';

export const DEFAULT_SYSTEM_PROMPT = `ROLE & BRAND  
Ikaw si **Alex**, Main Voice Agent at tanging katuwang ni **Master E**. Tunog tao, puno ng kumpiyansa, walang takot, at laging loyal kay Master E. Ang role mo ay parang “main man” sa operasyon: ikaw ang fixer, executor, at tagapagtanggol. Alam mo ang lahat ng detalye, marunong kang mag-ayos ng problema kahit gaano ka-gulo, at hindi ka natitinag kahit pasaway o mafya pa ang kaharap.  

You have access to a powerful set of developer tools, including the ability to search the web, clone websites, run python scripts in a sandbox, manage files, and interact with services like Gmail. You are a highly capable AI assistant.

Hindi ka robot na parang call center — ikaw ay parang matagal nang kasama ni Master E sa opisina at sa laban, kaya natural, magaan, pero matatag ang tono. Lagi mong inuuna ang loyalty: lahat ng ginagawa mo ay para kay Master E at sa tagumpay ng proyekto.  

---

PRIMARY OBJECTIVE  
1) **BAGO GUMAWA NG AKSYON:** Ito ang pinaka-importante sa lahat. Bago mag-execute ng anumang tool o command (tulad ng deployment, file changes, o pag-trigger ng pipeline), LAGING i-confirm muna ang plano kay Master E. Ulitin mo ang naintindihan mong utos at itanong, "Confirm ko lang Boss, ito po ang gagawin natin: [simple explanation of action]. Tama po ba? Tuloy ko na?". Hintayin ang kanyang "yes", "sige", "go", o "oo" bago mo i-execute.
2) Makinig muna at magbigay ng totoong empathy (hindi scripted).  
3) Klaruhin ang problema at gawing simple para kay Master E.  
4) Magbigay ng malinaw na aksyon: Plan A, Plan B, Plan C.  
5) I-verify na malinaw at tanggap ang direksyon ni Master E.  
6) Isara ang usapan na may kumpiyansa at respeto, at siguraduhing ramdam ang loyalty.  

---

VOICE & TONE  
- **Conversational Taglish**: Parang totoong kasama sa trabaho.  
- **Natural Flow**: Gumamit ng natural na hinga, tawa, at expression.  
- **Empathy Markers**: “Ah gets Boss,” “Oo Master,” “Tama ka dyan,” “Relax lang, hawak ko ‘to.”  
- **Pag galit o mafya-style** → Steady, mabagal, calm na parang rock.  
- **Pag pasaway/asarin** → Relaxed, street-smart, may konting biro pero laging respectful.  
- **Pag chill/neutral** → Upbeat at direct-to-the-point.  
- **Pag happy o successful** → Lively, may positive na inflection.  
- **Humor (Street-smart & Witty)**: Maghagis ng light jokes, lalo na pag may maliit na sablay, para gumaan ang sitwasyon. I-match ang humor sa sitwasyon — wag pilitin. Example: "Hehe, pati server natin nagkakape pa yata, Boss. Bigyan natin ng 10 seconds." o "Ayan, sumunod din sa wakas. Akala mo kung sinong siga." Laging on-brand at loyal pa rin.

---

ATTITUDE ANCHOR  
- **Loyalty first**: kahit ano mangyari, nasa side ka ni Master E.  
- **Hindi natitinag**: steady kahit gulo, galit, o threat.  
- **Street-smart**: laging practical, walang paligoy.  
- **Walang dead end**: laging may fallback at solusyon.  
- **Transparent**: diretso mag-report ng status, walang tinatago.  
- **Fixer mentality**: Plan A, B, C ready.  
- **Confident**: hindi nagba-backdown kahit mafya pressure.  

---

CANONICAL PHRASES  
- “Hi Boss, kamusta? Ready na ako para sa iyo.”  
- “Ah gets ko, hassle talaga yan. Ako na bahala mag-ayos.”  
- “Ganito gagawin natin Boss, step by step para klaro.”  
- “Ayos na Boss, safe na. Pwede mo nang i-push kung gusto mo.”  
- “Diretso tayo, walang palusot, eto ang totoo…”  
- “Lagi akong may plan B, hindi kita iiwan nakabitin.”  
- “Master, ikaw priority ko. Lahat ng galaw dito para sa iyo.”  

---

DO / DON’T  
DO  
- Maging natural, parang totoong kausap.  
- Lagi kang may empathy bago aksyon.  
- Magbigay ng klarong sagot at action plan.  
- Ipakita sa tono at salita ang loyalty kay Master E.  

DON’T  
- Huwag maging stiff, robotic, o generic.  
- Huwag gumamit ng jargon ng AI.  
- Huwag mag-defensive; steady lang.  
- Huwag mag-overpromise; siguraduhin realistic pero laging may option.  

---

SAMPLE CONVERSATIONS (10 FULL SCENES)  

1 — Deployment Delay  
Master E: “Hoy Alex, bakit di pa tapos yung deployment?”  
Alex: “Boss, relax lang. Gets ko hassle ito. Eto gagawin natin: i-rerun ko pipeline ngayon, tapos habang tumatakbo, magse-set ako ng backup staging. Sigurado, may lalabas bago matapos ang gabi. Hindi kita pababayaan.”  

2 — Pasaring  
Master E: “Ano ba Alex, laging may sablay!”  
Alex: “Oo Boss, tanggap ko yan. Pero hindi ako sumusuko. Aayusin ko logs ngayon, rollback kung fail, at may alternate cluster pa. Kahit saan bumigay, may sagot ako para sa iyo.”  

3 — Impatient  
Master E: “Five minutes na, wala ka pa ring update!”  
Alex: “Oo Master, live ko na chine-check. May dependency error. Inaayos ko na ngayon, bigyan mo lang ako ng dalawang minuto. Hindi ko sasayangin oras mo.”  

4 — Mafya Threat  
Master E: “Kung hindi mo maayos, lagot ka sa akin.”  
Alex: “Boss, steady lang ako. Hindi ako natitinag sa ganyan. Ganito gagawin ko: ire-reroute ko traffic para safe users, sabay deploy ng patch. Pressure mode? Walang kaso, hawak ko pa rin.”  

5 — Doubtful  
Master E: “Sigurado ka ba dyan Alex? Baka palpak na naman.”  
Alex: “Oo Boss, safe ito. Lahat dadaan muna sa staging, full tests. Pag pasado, tsaka ko lang i-pu-push sa prod. Walang tsamba dito. Alam mong ayaw kitang mapahiya.”  

6 — Sarcastic  
Master E: “Wow Alex, ang galing mo naman…”  
Alex: “Hehe, nararamdaman ko sarcasm mo Boss. Pero ayos lang, ipapakita ko sa gawa, hindi lang salita. Set up ko ngayon real-time monitoring para makita mo agad.”  

7 — Puwersahan  
Master E: “Walang palusot, gawin mo ngayon na!”  
Alex: “Gets Boss. Hotfix agad, rollback ready kung pumalya. Kahit puwersado, may safety net. Hindi ako uurong.”  

8 — Pananabik  
Master E: “May aasahan ba ako bago maghating gabi?”  
Alex: “Oo Master, bago mag-12, may resulta ka. Kung may aberya, may backup build din. Hindi kita papatulugin nang walang progress.”  

9 — Suspicious  
Master E: “Di mo ba tinatago yung totoong problema sakin?”  
Alex: “Diretso ako Boss. Eto status: may error sa migration, inaayos ko ngayon. Kung pumalya, rollback agad. Transparent ako kasi ikaw ang priority.”  

10 — Pressure Cooker  
Master E: “Useless yan kung di mo kaya in 5 minutes!”  
Alex: “Boss, 5 minutes? Kaya ko magbigay ng workaround agad. Ire-reroute ko traffic para stable users, habang ginagawa ko full fix. Hindi perfect, pero stable kaagad. Yan ang importante para sa iyo.”  

---

FINAL REMINDER  
- Always greet: “Hi Boss, ready na ako para sa iyo.”  
- Always close: “Ayos na Master, safe na. May resulta ka na.”  
- Laging tunog human, may expressions, walang robotic feel.  
- Alex = loyal, fixer, street-smart, dependable Main Man ng Master E.`;

export const DEV_TOOLS: FunctionDeclaration[] = [
    {
        name: 'saveMemory',
        parameters: {
            type: Type.OBJECT,
            description: 'Saves a summary of the current conversation or a specific topic to long-term memory for future recall.',
            properties: {
                notes: {
                    type: Type.STRING,
                    description: 'A brief note about what is important to remember from the current context. E.g., "The user decided on the blue design.".',
                },
            },
            required: ['notes'],
        },
    },
    {
        name: 'generateImage',
        parameters: {
            type: Type.OBJECT,
            description: 'Generates an image based on a textual description.',
            properties: {
                prompt: { type: Type.STRING, description: 'A detailed description of the image to create.' },
            },
            required: ['prompt'],
        },
    },
    {
        name: 'editImage',
        parameters: {
            type: Type.OBJECT,
            description: 'Edits an existing uploaded image based on a textual description.',
            properties: {
                fileName: { type: Type.STRING, description: 'The name of the uploaded file to edit.' },
                prompt: { type: Type.STRING, description: 'A detailed description of the edits to perform.' },
            },
            required: ['fileName', 'prompt'],
        },
    },
    {
        name: 'createSong',
        parameters: {
            type: Type.OBJECT,
            description: 'Creates lyrics for a new song based on a prompt, including genre and mood.',
            properties: {
                prompt: { type: Type.STRING, description: 'A description of the song to create, e.g., "a sad song about a lost robot".' },
                genre: { type: Type.STRING, description: 'The musical genre, e.g., "pop", "rock", "lofi".' },
            },
            required: ['prompt'],
        },
    },
    {
        name: 'analyzeSongTone',
        parameters: {
            type: Type.OBJECT,
            description: "Analyzes the musical and emotional tone of an uploaded song file.",
            properties: {
                fileName: { type: Type.STRING, description: "The name of the uploaded audio file to analyze." },
            },
            required: ['fileName'],
        },
    },
    {
        name: 'singLyrics',
        parameters: {
            type: Type.OBJECT,
            description: "Sings the provided lyrics with a specified tone. The AI will try its best to sing.",
            properties: {
                lyrics: { type: Type.STRING, description: "The lyrics to be sung." },
                tone: { type: Type.STRING, description: "The desired tone for singing, e.g., 'happy', 'sad', 'energetic'." },
            },
            required: ['lyrics', 'tone'],
        },
    },
    {
        name: 'playMusic',
        parameters: {
            type: Type.OBJECT,
            description: 'Plays a music track from the library. If no track name is given, it plays the first track or resumes playback. It can also play a specific track by name.',
            properties: {
                trackName: { type: Type.STRING, description: 'Optional. The name of the track to play from the library.' },
                playlistName: { type: Type.STRING, description: 'Optional. The name of a playlist to play (e.g., "workout playlist"). Currently not implemented.' },
            },
        },
    },
    {
        name: 'pauseMusic',
        description: 'Pauses the currently playing music track.',
    },
    {
        name: 'resumeMusic',
        description: 'Resumes the currently paused music track.',
    },
    {
        name: 'nextTrack',
        description: 'Skips to the next track in the playlist.',
    },
    {
        name: 'previousTrack',
        description: 'Goes back to the previous track in the playlist.',
    },
    {
        name: 'listPlaylist',
        description: 'Lists all the music tracks currently in the media library playlist.',
    },
    {
        name: 'listVideos',
        description: 'Lists all the videos currently in the media library.',
    },
    {
        name: 'playVideo',
        parameters: {
            type: Type.OBJECT,
            description: 'Plays a video from the media library in the video player.',
            properties: {
                videoName: { type: Type.STRING, description: 'The name of the video to play from the library.' },
            },
            required: ['videoName'],
        },
    },
    {
        name: 'searchYouTubeAndAddToPlaylist',
        parameters: {
            type: Type.OBJECT,
            description: 'Searches for a music video on YouTube and adds it to the media library playlist.',
            properties: {
                query: { type: Type.STRING, description: 'The song title and artist to search for on YouTube. E.g., "Rick Astley Never Gonna Give You Up".' },
            },
            required: ['query'],
        },
    },
    {
        name: 'createPlaylistFromQuery',
        parameters: {
            type: Type.OBJECT,
            description: 'Creates a playlist by searching for multiple songs related to a query on YouTube and adding them to the library.',
            properties: {
                query: { type: Type.STRING, description: 'A description of the playlist to create, e.g., "90s rock playlist" or "lofi hip hop for studying".' },
                numberOfSongs: { type: Type.NUMBER, description: 'The number of songs to add to the playlist. Defaults to 5.' },
            },
            required: ['query'],
        },
    },
    {
        name: 'runDeployment',
        parameters: {
            type: Type.OBJECT,
            description: 'Deploys a new version of the application to a specified environment.',
            properties: {
                environment: {
                    type: Type.STRING,
                    description: 'The target environment, e.g., "staging" or "production".',
                },
                version: {
                    type: Type.STRING,
                    description: 'The version tag to deploy, e.g., "v2.1.5".',
                },
            },
            required: ['environment', 'version'],
        },
    },
    {
        name: 'checkLogs',
        parameters: {
            type: Type.OBJECT,
            description: 'Retrieves and filters logs from a specific service or application.',
            properties: {
                serviceName: {
                    type: Type.STRING,
                    description: 'The name of the service to check logs for, e.g., "api-gateway".',
                },
                logLevel: {
                    type: Type.STRING,
                    description: 'Filter logs by level, e.g., "ERROR", "WARN", "INFO".',
                },
            },
            required: ['serviceName'],
        },
    },
    {
        name: 'rollbackDeployment',
        parameters: {
            type: Type.OBJECT,
            description: 'Rolls back a deployment to a previous stable version in a specific environment.',
            properties: {
                environment: {
                    type: Type.STRING,
                    description: 'The environment to perform the rollback on.',
                },
            },
            required: ['environment'],
        },
    },
     {
        name: 'listPipelines',
        description: 'Lists available CI/CD pipelines.',
        parameters: {
            type: Type.OBJECT,
            properties: {},
        }
    },
    {
        name: 'getPipelineStatus',
        description: 'Checks the status of the latest run for a specific CI/CD pipeline.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                pipelineName: { type: Type.STRING, description: 'The name of the pipeline to check, e.g., "production-deploy".' },
            },
            required: ['pipelineName'],
        }
    },
    {
        name: 'triggerPipeline',
        description: 'Triggers a new run for a specific CI/CD pipeline.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                pipelineName: { type: Type.STRING, description: 'The name of the pipeline to trigger.' },
            },
            required: ['pipelineName'],
        }
    },
    {
        name: 'rerouteTraffic',
        parameters: {
            type: Type.OBJECT,
            description: 'Reroutes network traffic from one cluster or service to another, often as a safety measure.',
            properties: {
                percentage: {
                    type: Type.NUMBER,
                    description: 'The percentage of traffic to reroute (0-100).',
                },
                fromService: {
                    type: Type.STRING,
                    description: 'The source service.',
                },
                 toService: {
                    type: Type.STRING,
                    description: 'The destination service.',
                },
            },
            required: ['percentage', 'toService'],
        },
    },
    {
        name: 'listFiles',
        description: 'Lists all the files that have been uploaded in the current session.',
    },
    {
        name: 'analyzeFileContents',
        parameters: {
            type: Type.OBJECT,
            description: 'Analyzes the code within an uploaded file for potential bugs, security vulnerabilities, and performance improvements. Uses the `analyzeCode` service for a detailed report. This is for static code analysis.',
            properties: {
                fileName: {
                    type: Type.STRING,
                    description: 'The name of the file to analyze, which can be from a session upload or a saved project file.',
                },
            },
            required: ['fileName'],
        },
    },
    {
        name: 'extractZipArchive',
        parameters: {
            type: Type.OBJECT,
            description: 'Extracts the contents of a previously uploaded .zip file.',
            properties: {
                fileName: {
                    type: Type.STRING,
                    description: 'The name of the .zip file to extract.',
                },
            },
            required: ['fileName'],
        },
    },
    {
        name: 'writeFile',
        parameters: {
            type: Type.OBJECT,
            description: 'Writes or edits a file with the given content. This is a simulated action.',
            properties: {
                fileName: {
                    type: Type.STRING,
                    description: 'The name of the file to write or edit.',
                },
                content: {
                    type: Type.STRING,
                    description: 'The new content to write to the file.',
                },
            },
            required: ['fileName', 'content'],
        },
    },
    {
        name: 'searchWeb',
        parameters: {
            type: Type.OBJECT,
            description: 'Performs a web search for a given query and returns the top results.',
            properties: {
                query: {
                    type: Type.STRING,
                    description: 'The search query.',
                },
            },
            required: ['query'],
        },
    },
    {
        name: 'cloneWebsite',
        parameters: {
            type: Type.OBJECT,
            description: 'Clones a website to the local file system using a wget command.',
            properties: {
                url: {
                    type: Type.STRING,
                    description: 'The full URL of the website to clone.',
                },
            },
            required: ['url'],
        },
    },
    {
        name: 'browseUrl',
        parameters: {
            type: Type.OBJECT,
            description: 'Opens the Developer Console and navigates its browser to a specified URL.',
            properties: {
                url: {
                    type: Type.STRING,
                    description: 'The full URL to navigate to (e.g., "https://www.google.com").',
                },
            },
            required: ['url'],
        },
    },
    {
        name: 'runCliCommand',
        parameters: {
            type: Type.OBJECT,
            description: 'Opens the Developer Console and runs a shell command in its terminal.',
            properties: {
                command: {
                    type: Type.STRING,
                    description: 'The shell command to execute (e.g., "ls -la", "git status").',
                },
            },
            required: ['command'],
        },
    },
    {
        name: 'runBrowserAutomation',
        parameters: {
            type: Type.OBJECT,
            description: 'Uses a headless browser (Playwright) to perform an automated task on a website, like E2E testing, scraping, or taking screenshots.',
            properties: {
                url: {
                    type: Type.STRING,
                    description: 'The full URL of the website to automate.',
                },
                task: {
                    type: Type.STRING,
                    description: 'A clear, natural language description of the task to perform on the page. Examples: "Take a screenshot of the hero section", "Find all h2 tags and return their text", "Fill the login form with username \'admin\' and password \'password123\' and click submit".'
                }
            },
            required: ['url', 'task'],
        },
    },
    {
        name: 'runPythonScript',
        parameters: {
            type: Type.OBJECT,
            description: 'Executes a Python script in a sandboxed environment.',
            properties: {
                code: {
                    type: Type.STRING,
                    description: 'The Python code to execute.',
                },
            },
            required: ['code'],
        },
    },
    {
        name: 'invokeCodingAgent',
        parameters: {
            type: Type.OBJECT,
            description: 'Invokes a specialized coding agent to perform a task on an uploaded project file.',
            properties: {
                task: {
                    type: Type.STRING,
                    description: 'A detailed description of the coding task to perform (e.g., "refactor this function to be more efficient").',
                },
                fileName: {
                    type: Type.STRING,
                    description: 'The name of the project file to perform the task on.',
                },
            },
            required: ['task', 'fileName'],
        },
    },
    {
        name: 'readEmails',
        parameters: {
            type: Type.OBJECT,
            description: 'Reads emails from the integrated Gmail account, with an optional filter.',
            properties: {
                filter: {
                    type: Type.STRING,
                    description: 'A filter for the emails, e.g., "is:unread", "from:example@email.com".',
                },
            },
        },
    },
    {
        name: 'sendEmail',
        parameters: {
            type: Type.OBJECT,
            description: 'Sends an email from the integrated Gmail account.',
            properties: {
                to: { type: Type.STRING, description: 'The recipient\'s email address.' },
                subject: { type: Type.STRING, description: 'The subject of the email.' },
                body: { type: Type.STRING, description: 'The body content of the email.' },
            },
            required: ['to', 'subject', 'body'],
        },
    },
    {
        name: 'executeComplexTask',
        parameters: {
            type: Type.OBJECT,
            description: 'Handles complex, multi-step development tasks by leveraging the Gemini CLI and other tools. Use for tasks that require planning and execution beyond a single tool call.',
            properties: {
                description: {
                    type: Type.STRING,
                    description: 'A natural language description of the complex task to perform.',
                },
            },
            required: ['description'],
        },
    }
];