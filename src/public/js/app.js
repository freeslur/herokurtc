const socket = io();
const call = document.getElementById('call');
const myFace = document.getElementById('myFace');
const muteBtn = document.getElementById('mute');
const cameraBtn = document.getElementById('camera');
const camerasSelect = document.getElementById('cameras');

call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;

// ローカルのカメラリスト取得
async function getCameras() {
  try {
    const devices = navigator.mediaDevices.enumerateDevices();
    const cameras = (await devices).filter((device) => device.kind == 'videoinput');
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach((camera) => {
      const option = document.createElement('option');
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.deviceId === camera.deviceId) {
        option.selected = true;
      }
      camerasSelect.appendChild(option);
    });
  } catch (e) {
    console.log(e);
  }
}

async function getMedia(deviceId) {
  const initialConstrains = {
    audio: true,
    video: { facingMode: 'user' },
  };
  const cameraConstrains = {
    audio: true,
    video: { deviceId: { exact: deviceId } },
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstrains : initialConstrains
    );
    myFace.srcObject = myStream;
    if (!deviceId) {
      await getCameras();
    }
  } catch (e) {
    console.log(e.message);
  }
}

muteBtn.addEventListener('click', () => {
  myStream.getAudioTracks().forEach((track) => {
    track.enabled = !track.enabled;
  });
  if (!muted) {
    muteBtn.innerText = 'Unmute';
    muted = true;
  } else {
    muteBtn.innerText = 'Mute';
    muted = false;
  }
});

function handleVideoOff() {
  myStream.getVideoTracks().forEach((track) => {
    track.enabled = !track.enabled;
  });
  if (!cameraOff) {
    cameraBtn.innerText = 'Turn Camera On';
    cameraOff = true;
  } else {
    cameraBtn.innerText = 'Turn Camera Off';
    cameraOff = false;
  }
}

cameraBtn.addEventListener('click', handleVideoOff);

async function handleCameraChange() {
  await getMedia(camerasSelect.value);
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === 'video');
    videoSender.replaceTrack(videoTrack);
  }
}

camerasSelect.addEventListener('input', handleCameraChange);

// Welcome

const welcome = document.getElementById('welcome');
const welcomeForm = welcome.querySelector('form');

async function initCall() {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
}

async function handleWelcomeSubmit(event) {
  event.preventDefault();
  const input = welcomeForm.querySelector('input');
  await initCall();
  socket.emit('join_room', input.value);
  roomName = input.value;
  input.value = '';
}

welcomeForm.addEventListener('submit', handleWelcomeSubmit);

// Socket

// first entered client
socket.on('welcome', async () => {
  const offer = await myPeerConnection.createOffer();
  myDataChannel = myPeerConnection.createDataChannel('labo');
  myDataChannel.addEventListener('message', console.log);
  console.log('made data channel');
  myPeerConnection.setLocalDescription(offer);
  console.log('sent the offer');
  socket.emit('offer', offer, roomName);
});

// second entered client
socket.on('offer', async (offer) => {
  myPeerConnection.setRemoteDescription(offer);
  myDataChannel.addEventListener('datachannel', console.log);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit('answer', answer, roomName);
});

socket.on('answer', (answer) => {
  myPeerConnection.setRemoteDescription(answer);
});

socket.on('ice', (ice) => {
  myPeerConnection.addIceCandidate(ice);
});

// RTC

const peerFace = document.getElementById('peerFace');

function handleIce(data) {
  socket.emit('ice', data.candidate, roomName);
}

function handleAddStream(data) {
  peerFace.srcObject = data.stream;
}

function makeConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: ['turn:35.76.15.32:3478'],
        username: 'coturn',
        credential: 'coturn',
      },
    ],
  });
  myPeerConnection.addEventListener('icecandidate', handleIce);
  myPeerConnection.addEventListener('addstream', handleAddStream);
  myStream.getTracks().forEach((track) => myPeerConnection.addTrack(track, myStream));
}
