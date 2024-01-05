var myWebSocket;
var COMFTY_URL = "/sd";
var WS = `ws://${window.location.host}/ws`;
var clientId = generateId(); //can be windows name
var workflow = {};
var isSendingPhoto = false;
var progressCss = 'w-0';


function initializeApp() {
  //init chat
  initChat();

  loadWorkflow();
  connectToWS();
}

async function loadWorkflow() {
  fetch("workflow_api.json")
    .then((response) => response.json())
    .then((json) => {
        console.log('workflow loaded');
        workflow = json;
    });
}

function generateId() {
  return "xxxxxyxxxxxxxxxxxxyxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function connectToWS() {
  if (myWebSocket !== undefined) {
    myWebSocket.close();
  }

  myWebSocket = new WebSocket(`${WS}?clientId=${clientId}`);

  myWebSocket.onmessage = function (event) {
    var leng;
    if (event.data.size === undefined) {
      leng = event.data.length;
    } else {
      leng = event.data.size;
    }
    console.log("onmessage. size: " + leng + ", content: " + event.data);
    const message = JSON.parse(event.data);

    if (message["type"] == "progress") {
      const data = message["data"];
      if (data["value"] && data["max"]) {
        let ImgProgress = parseInt(
          100 * (Number(data["value"]) / Number(data["max"]))
        );
        //display progress?
        displayProgress(ImgProgress);
      }
    } else if (message["type"] == "executed") {
      const data = message["data"];

      console.log("--onmessage. exectured:" + data);

      if (
        data["output"] &&
        data["output"]["images"] &&
        data["output"]["images"][0] &&
        data["output"]["images"][0]["filename"] &&
        data["output"]["images"][0]["type"]=='output'
      ) {
        let imgURL = `${COMFTY_URL}/view?filename=${
          data["output"]["images"][0]["filename"]
        }&subfolder=${data["output"]["images"][0]["subfolder"]}&type=${
          data["output"]["images"][0]["type"]
        }&rand=${Math.random()}`;
        //display image
        console.log('IMG URL',imgURL);
        displayPhotoToChat(imgURL);
      }
    } else if (message["type"] == "status") {
      const data = message["data"];
      if (
        data["status"] &&
        data["status"]["exec_info"] &&
        data["status"]["exec_info"]["queue_remaining"] == 0
      ) {
        //done
        isSendingPhoto = false;
      }
    }
  };

  myWebSocket.onopen = function(evt) {
    toggleConnection(true);
    console.log("onopen.");
  };

  myWebSocket.onclose = function(evt) {
      toggleConnection(false);
      console.log("onclose.");
  };

  myWebSocket.onerror = function(evt) {
      toggleConnection(false);
      addChatPop(JSON.stringify(err, ["message", "arguments", "type", "name"]),false);
      console.error("Error!");
  };
}

function sendMsg() {
  var message = document.getElementById("myMessage").value;
  myWebSocket.send(message);
}

function closeConn() {
  myWebSocket.close();
}

function processPrompt(description){
  workflow["6"]["inputs"]["text"]
  if (
    workflow["6"] &&
    workflow["6"]["inputs"] &&
    workflow["6"]["inputs"]["text"]
  ) {
    let pref = workflow["6"]["inputs"]["text"]
    workflow["6"]["inputs"]["text"] = description.concat(pref);
  }

  //randomize
  workflow["3"]["inputs"]["seed"]=Math.random()*10000;

  sendPrompt(JSON.stringify(workflow));
}

// API request
async function sendPrompt(prompt) {
  let payload = `{"client_id":"${clientId}", "prompt":${prompt}}`;
  const response = await fetch(COMFTY_URL + "/prompt", {
    method: "POST",
    mode: "cors", // no-cors, *cors, same-origin
    credentials: "same-origin", // include, *same-origin, omit
    headers: { "Content-Type": "application/json" },
    // referrerPolicy: "strict-origin-when-cross-origin", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-ur
    body: payload, // body data type must match "Content-Type" header
  });
  const responseJson = await response.json();
  console.log('requesting photo',responseJson);
  if (response["error"]) {
    //alert and pause
    console.error('sd error:',response["error"]);
    isSendingPhoto = false;
  }
  isSendingPhoto = true;
}

function displayProgress(progress){
  //clean
  let progressBar = document.getElementById('progressBar');
  progressBar.classList.remove(progressCss);

  //percentage
  let newCss = 'w-0'
  if(progress==100) newCss='w-0'
  else if(progress<100 && progress > 75) newCss='w-3/4'
  else if(progress<75 && progress > 50) newCss='w-2/4'
  else if(progress<50 && progress > 25) newCss='w-1/4'
  else if(progress<25 && progress > 0) newCss='w-1/4'
  else newCss='w-0';

  progressCss=newCss;
  progressBar.classList.add(progressCss);
}

function displayPhotoToChat(imgURL){
  console.log('displaying:',imgURL);
  let message = `<img onclick="displayImg('${imgURL}')"class="w-2/4 h-auto" src="${imgURL}" />`;
  saveChat(message,false);
  addChatPop(message,false);
}

//Image display
function closeImgModal(){
  const imgModal = document.getElementById("imgModal");
  imgModal.classList.add("hidden");
}

function displayImg(imgURL){
  const imgContainer = document.getElementById("imgContainer");
  imgContainer.innerHTML = `<img
                          alt="gallery"
                          class="block h-full w-full rounded-lg object-cover object-center"
                          src="${imgURL}" />`

  const imgModal = document.getElementById("imgModal");
  imgModal.classList.remove("hidden");
}

function toggleConnection(con){
  isConnected = con;
  var cb = document.getElementById("connectBtnContainer");
  if(!isConnected){
      cb.innerHTML = `<img class="w-10 h-10" src="img/oval.svg" />`;
  }else{
      cb.innerHTML = `
      <svg class="w-10 h-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" enable-background="new 0 0 64 64"><path d="M32,2C15.431,2,2,15.432,2,32c0,16.568,13.432,30,30,30c16.568,0,30-13.432,30-30C62,15.432,48.568,2,32,2z M25.025,50
        l-0.02-0.02L24.988,50L11,35.6l7.029-7.164l6.977,7.184l21-21.619L53,21.199L25.025,50z" fill="#43a047"/></svg>`;
  }
}