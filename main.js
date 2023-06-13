// More API functions here:
// https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/pose

// the link to your model provided by Teachable Machine export panel
const URL = './my_model/';
let model, webcam, ctx, labelContainer, maxPredictions;
let currChallangeIndex = 0
let loadedModels = false
let hasStarted = false
let skipLetters = ['ך', 'ם', 'ן', 'ף', 'ץ']
let skippedLettersOffset = 0
let canSucceed = true

let failVideoIntervalID
const failVideoInteralTime = 18000

addEventListener('load', handleBodyLoaded);

function handleBodyLoaded(e) {
    setHomeState(true)
}

function setHomeState(value) {
    let coverImgElm = document.querySelector('.home-container img.cover-image')
    let startBtnElm = document.querySelector('.home-container svg#start-button')
    if (value) {
        startBtnElm.addEventListener('click', goToStartVideo)
        coverImgElm.classList.remove('hidden')
        startBtnElm.classList.remove('hidden')
    } else {
        startBtnElm.removeEventListener('click', goToStartVideo)
        coverImgElm.classList.add('hidden')
        startBtnElm.classList.add('hidden')
    }
}

function setStartVideoState(value) {
    let startVideoElm = document.querySelector('.home-container video#start-video')
    if (value) {
        startVideoElm.classList.remove('hidden')
        startVideoElm.addEventListener('ended', delayedGoToTrack)
    } else {
        startVideoElm.classList.add('hidden')
        startVideoElm.load()
        startVideoElm.removeEventListener('ended', delayedGoToTrack)
    }
}

function pressedHomeButton() {
    setStartVideoState(false)
    setHomeState(true)
    let homeContainer = document.querySelector('section.home-container')
    homeContainer.classList.remove('hidden')

    let trackContainer = document.querySelector('section.track-container')
    trackContainer.classList.add('hidden')

    let gameSectionElm = document.querySelector('section.game-container')
    gameSectionElm.classList.add('hidden')
    let videoElm = document.querySelector('video#letter-video')
    videoElm.load()
}

function goToStartVideo(e) {
    setHomeState(false)

    setStartVideoState(true)
    let startVideoElm = document.querySelector('.home-container video#start-video')
    startVideoElm.play()
}

function delayedGoToTrack() {
    setTimeout(goToTrack, 500)
}

function goToTrack() {
    setStartVideoState(false)
    let homeContainer = document.querySelector('section.home-container')
    homeContainer.classList.add('hidden')

    let trackContainer = document.querySelector('section.track-container')
    trackContainer.classList.remove('hidden')
}

function pressedStartGameButton() {
    let trackContainer = document.querySelector('section.track-container')
    trackContainer.classList.add('hidden')
    let gameSectionElm = document.querySelector('section.game-container')
    gameSectionElm.classList.remove('hidden')
    let videoElm = document.querySelector('video#letter-video')
    videoElm.classList.remove('hidden')
    videoElm.play()
    init()
}

async function init() {
    const modelURL = URL + 'model.json';
    const metadataURL = URL + 'metadata.json';

    // load the model and metadata
    // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
    // Note: the pose library adds a tmPose object to your window (window.tmPose)
    model = await tmPose.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // Convenience function to setup a webcam
    const size = 400;
    const flip = true; // whether to flip the webcam
    webcam = new tmPose.Webcam(size, size, flip); // width, height, flip
    await webcam.setup(); // request access to the webcam
    await webcam.play();
    window.requestAnimationFrame(loop);

    // append/get elements to the DOM
    const canvas = document.getElementById('canvas');
    canvas.width = size; canvas.height = size;
    ctx = canvas.getContext('2d');
    // labelContainer = document.getElementById('label-container');
    // for (let i = 0; i < maxPredictions; i++) { // and class labels
    //     labelContainer.appendChild(document.createElement('div'));
    // }
    loadedModels = true
    
    failVideoIntervalID = setInterval(goToFailVideo, failVideoInteralTime)

    window.requestAnimationFrame(loop);
}

async function loop(timestamp) {
    webcam.update(); // update the webcam frame
    await predict();
    // if (mode == VIEW_VIDEO_MODE) return
    window.requestAnimationFrame(loop);
}

async function predict() {
    // Prediction #1: run input through posenet
    // estimatePose can take in an image, video or canvas html element
    const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
    // Prediction 2: run input through teachable machine classification model
    const prediction = await model.predict(posenetOutput);

    for (let i = 0; i < maxPredictions; i++) {
        // const labelElm = labelContainer.childNodes[i]
        // const classPrediction = prediction[i].className + ': ' + prediction[i].probability.toFixed(2);
        // labelElm.innerText = classPrediction;
        const loadbarElm = document.getElementById('load-bar')
        if (i === currChallangeIndex) {
            let percent = (prediction[i].probability * 100).toFixed(2)
            loadbarElm.style.clipPath = `polygon(0% 0%, ${percent}% 0, ${percent}% 100%, 0 100%)`
            if (prediction[i].probability >= 0.98 && canSucceed) {
                playerSuccess()
            }
        }
    }
    // finally draw the poses
    // drawPose(pose);
}

function goToFailVideo() {
    canSucceed = false
    let letterVideoElm = document.querySelector('video#letter-video')
    letterVideoElm.classList.add('hidden')
    letterVideoElm.load()
    let failVideoElm = document.querySelector('video#fail-video')
    failVideoElm.classList.remove('hidden')
    failVideoElm.play()
    failVideoElm.addEventListener('ended', failVideoEnded)
}

function failVideoEnded() {
    canSucceed = true
    let failVideoElm = document.querySelector('video#fail-video')
    failVideoElm.removeEventListener('ended', failVideoEnded)
    failVideoElm.classList.add('hidden')
    failVideoElm.load()
    let letterVideoElm = document.querySelector('video#letter-video')
    letterVideoElm.classList.remove('hidden')
    letterVideoElm.play()

}

function playerSuccess(skipIncrement) {
    clearInterval(failVideoIntervalID)
    if (currChallangeIndex == 21) {
        currChallangeIndex = 0
        skippedLettersOffset = 0
        skipIncrement = true

    }
    if (!skipIncrement) currChallangeIndex++
    let currLetter =  String.fromCharCode(1488+currChallangeIndex+skippedLettersOffset);
    console.log(currLetter);
    if (skipLetters.includes(currLetter)) {
        skippedLettersOffset++
        playerSuccess(true)
        return
    }
    let letterVideoElm = document.querySelector('video#letter-video')
    letterVideoElm.classList.add('hidden')
    letterVideoElm.load()
    let successVideoElm = document.querySelector('video#success-video')
    successVideoElm.classList.remove('hidden')
    successVideoElm.play()
    successVideoElm.addEventListener('ended', onSuccessVideoEnded)
}

function onSuccessVideoEnded() {
    let successVideoElm = document.querySelector('video#success-video')
    successVideoElm.removeEventListener('ended', onSuccessVideoEnded)
    successVideoElm.classList.add('hidden')
    successVideoElm.load()
    let currLetter =  String.fromCharCode(1488+currChallangeIndex+skippedLettersOffset);
    document.getElementById('current-challange').innerText = currLetter
    document.getElementById('letter').innerHTML = currLetter
    let videoElm = document.getElementById('letter-video')
    videoElm.classList.remove('hidden')
    videoElm.src = `videos/${currLetter}.mp4`
    videoElm.play()

    failVideoIntervalID = setInterval(goToFailVideo, failVideoInteralTime)
    canSucceed = false
    setTimeout(_ => canSucceed=true, 5000)
}
