var isBusy = false;
var audio = '';
var AI_NAME = 'Liza';
var USER_NAME = 'Ryan';
var savedChats = [];

function initChat(){
    //localStorage.removeItem("chatHistory");

    // check cache
    let chatHistory = localStorage.getItem("chatHistory");
    if(chatHistory){
        parsedCh = JSON.parse(chatHistory);
        parsedCh.forEach(chat => {
            savedChats.push(chat);
            addChatPop(chat['content'], (chat['role']=='user'));
        });
    }else{
        //init chatpop
        saveChat('Hey, thinking of you right now...',false);
        addChatPop('Hey, thinking of you right now...',false);
        //init cache for context (change as needed)
        saveChat(`You do? I miss you`,true);
        saveChat('I miss you too',false);
        saveChat(`What do you want to do?`,true);
        saveChat(`Let's just enjoy the chat`,false);
    }
    
    //init submit action
    let chatForm = document.getElementById("chatForm");
    chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        // document.getElementById("submitBtn").click();
    });
}

function clearCache(){
    localStorage.removeItem("chatHistory");
}

function scrollToBot(){
    setTimeout(()=>{
        const cb = document.getElementById('chatBox');
        const lastChild = cb.lastChild;            
        lastChild.scrollIntoView({
            block: "nearest",
            inline: "center",
            behavior: "smooth",
            alignToTop: false
        });
    },100)
}

function chat(){
    var inpt = document.getElementById("submitBtn");
    inpt.focus();

    let message = document.getElementById('chatInput').value

    message = filterChat(message);

    saveChat(message,true);
    addChatPop(message,true);

    //check if photo or message
    if(message.includes("send") && (message.includes("pic") || message.includes("photo") || message.includes("picture"))){
        // avoid multiple request on image generation
        if(!isSendingPhoto && !isBusy){
            processPrompt();
        }

        //simulate a sending photo
        addChatPop(`<i>...is sending a photo</i>`,false);
    }else{
        sendChat(message);
    }
    document.getElementById('chatInput').value = '';
}

function reply(message){
    message = filterChat(message);
    saveChat(message,false);
    addChatPop(message,false);
}

function filterChat(message){
    //UI fix to remove hallucinations in some models
    message = message.replaceAll('[', '');
    message = message.replaceAll(']', '');
    message = message.replaceAll('{', '');
    message = message.replaceAll('}', '');
    message = message.replaceAll('"', '');
    message.split(":")[0];
    return message;    
}

function saveChat(message,fromMe){
    savedChats.push({'content':message, 'role':(fromMe?'user':'char')});

    let st = "["
    savedChats.forEach((item,index)=>{
        st = st.concat(JSON.stringify(item));
        if(index < (savedChats.length-1)){
            st = st.concat(',');
        }
    })
    st = st.concat("]");
    localStorage.setItem("chatHistory",`${st}`);
}

function addChatPop(message,fromMe){
    const d = new Date();
    let hour = d.getHours();
    let min = d.getMinutes();

    const cb = document.getElementById('chatBox');
    cb.innerHTML+= `
                <div class="flex ${fromMe ? 'flex-row-reverse':'flex-row'} items-start gap-2.5 mt-4">
                    <img class="w-40 h-40 lg:w-10 lg:h-10 rounded-full" src="${fromMe ? '/img/profile-user.jpg' : '/img/profile-ai.jpg'}" alt="profile image">
                    <div
                        class="flex flex-col w-full max-w-[320px] leading-1.5 p-4 ${fromMe ? 'bg-blue-300 bg-blue-100 dark:bg-blue-700 rounded-s-xl rounded-ee-xl' : 'border-gray-200 bg-gray-100 dark:bg-gray-700 rounded-e-xl rounded-es-xl'}">
                        <div class="flex items-center space-x-2 ltr:space-x-reverse">
                            <span class="text-4xl lg:text-2xl mb-2 font-semibold text-gray-900 dark:text-white">${fromMe?USER_NAME : AI_NAME}</span>
                            <span class="text-4xl lg:text-2xl font-normal text-gray-500 dark:text-gray-400">${hour}:${min}</span>
                        </div>
                        <p class="text-4xl lg:text-2xl font-normal py-2.5 text-gray-900 dark:text-white">${message}</p>
                    </div>
                </div>`
    scrollToBot();
}

function showLoader(){
    setTimeout(()=>{
        addChatPop('<img class="w-5 h-5" src="img/three-dots.svg" />',false);scrollToBot();},1000);
        
}

function hideLoader(){
    const cb = document.getElementById('chatBox');
    const lastChild = cb.lastChild;
    cb.removeChild(lastChild);
}

function setPayload(){
    let st = "["
    let tsaved = savedChats.slice(-5);
    tsaved.forEach((item,index)=>{
        st = st.concat(JSON.stringify(item));
        if(index < (tsaved.length-1)){
            st = st.concat(',');
        }
    })
    st = st.concat("]");

    return `{
        "messages": ${st},
        "mode": "chat-instruct",
        "character": "Default"
      }`
}

// API request
async function sendChat(message){
    if(isBusy) return;

    let payload = setPayload();
    isBusy = true;
    showLoader();

    const response = await fetch("/chat/completions", {
        method: "POST",
        mode: "cors",
        credentials: "same-origin",
        headers: {"Content-Type": "application/json"},
        body: payload, 
      });
    const responseJson = await response.json();
    console.log('reply:',responseJson);
    let replyMessage = responseJson['choices'][0]['message']['content'];

    hideLoader();

    reply(replyMessage);
    setTimeout(()=>{
        playVoice();
    },1);

    if(response['error']){
        //alert and pause
        console.error('error',response['error']);
    }
    isBusy = false;
}

function toggleVoice(){
    isVoicePlaying = !isVoicePlaying;
    if(isVoicePlaying) playVoice()
    else pauseVoice();
}

function playVoice(){
    const audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.src=`snd/default.wav?rand=${Math.random()}`;
    audioPlayer.play();

    isVoicePlaying = true;
}

function pauseVoice(){
    const audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.src=`snd/default.wav?rand=${Math.random()}`;
    audioPlayer.pause();

    isVoicePlaying = false;
}
