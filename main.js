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

let gameLoopRunning = false

let failVideoTimeoutID
let failVideoIntervalTime = 12500

addEventListener('load', handleBodyLoaded);

function handleBodyLoaded(e) {
    setHomeState(true)

    const urlParams = new URLSearchParams(window.location.search);
    const failVideoTimeParam = urlParams.get('try-again-time');
    if (failVideoTimeParam) failVideoIntervalTime = (Number(failVideoTimeParam)*1000);
}

function setHomeState(value) {
    let coverImgElm = document.querySelector('.home-container .cover-image')
    let startBtnElm = document.querySelector('.home-container button#start-button')
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

function pressedHomeButton(noRecursion) {
    setStartVideoState(false)
    setHomeState(true)
    let homeContainer = document.querySelector('section.home-container')
    homeContainer.classList.remove('hidden')

    let trackContainer = document.querySelector('section.track-container')
    trackContainer.classList.add('hidden')

    let gameSectionElm = document.querySelector('section.game-container')
    gameSectionElm.classList.add('hidden')
    let videoElms = document.querySelectorAll('video')
    clearTimeout(failVideoTimeoutID)
    videoElms.forEach(v => v.load())
    setZihuy(false)

    let letterVideoElmElm = document.querySelector('.game-container video#letter-video')
    letterVideoElmElm.src = `videos/א.mp4`
    let loadBarSpriteElm = document.querySelector('.load-bar-container img.sprite')
    loadBarSpriteElm.src = `./assets/sprite/א.png`
    currChallangeIndex = 0
    skippedLettersOffset = 0

    let currLetter =  String.fromCharCode(1488+currChallangeIndex+skippedLettersOffset);
    document.getElementById('letter').innerHTML = currLetter

    gameLoopRunning = false

    if (!noRecursion) setTimeout(noRecursion, 100, true)
}

function goToStartVideo(e) {
    setHomeState(false)

    let homeBtn = document.querySelector('#home-button')
    homeBtn.classList.remove('hidden')

    let textWrapperElm = document.querySelector('.home-container .text-wrapper')
    textWrapperElm.classList.add('hidden')

    setStartVideoState(true)
    let startVideoElm = document.querySelector('.home-container video#start-video')
    startVideoElm.play()
}

function delayedGoToTrack() {
    setTimeout(goToTrack, 500)
}

function goToTrack() {
    window.addEventListener("wheel", function (e) {
        if (!e.target.classList.contains('x-scroll')) return
        e.target.scrollLeft += e.deltaY
    });
    setStartVideoState(false)
    let homeContainer = document.querySelector('section.home-container')
    homeContainer.classList.add('hidden')

    let trackContainer = document.querySelector('section.track-container')
    trackContainer.classList.remove('hidden')

    let videoElm = document.querySelector('section.track-container video#track-video')
    videoElm.play()
}

function pressedStartGameButton() {
    let trackContainer = document.querySelector('section.track-container')
    trackContainer.classList.add('hidden')
    let gameSectionElm = document.querySelector('section.game-container')
    gameSectionElm.classList.remove('hidden')
    let videoElm = document.querySelector('video#letter-video')
    videoElm.classList.remove('hidden')
    videoElm.play()

    failVideoTimeoutID = setTimeout(goToFailVideo, failVideoIntervalTime)
    setTimeout(setZihuy, 6000, true)

    gameLoopRunning = true

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
    
    window.requestAnimationFrame(loop);
}

async function loop(timestamp) {
    webcam.update(); // update the webcam frame
    await predict();
    // if (mode == VIEW_VIDEO_MODE) return
    if (!gameLoopRunning) return
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
    setZihuy(false)
    let letterVideoElm = document.querySelector('video#letter-video')
    letterVideoElm.classList.add('hidden')
    letterVideoElm.load()
    let failVideoElm = document.querySelector('video#fail-video')
    failVideoElm.classList.remove('hidden')
    failVideoElm.play()
    failVideoElm.addEventListener('ended', failVideoEnded)
}

function failVideoEnded() {
    setZihuy(true)
    let failVideoElm = document.querySelector('video#fail-video')
    failVideoElm.removeEventListener('ended', failVideoEnded)
    failVideoElm.classList.add('hidden')
    failVideoElm.load()
    let letterVideoElm = document.querySelector('video#letter-video')
    letterVideoElm.classList.remove('hidden')
    letterVideoElm.play()

    failVideoTimeoutID = setTimeout(goToFailVideo, failVideoIntervalTime)
}

function playerSuccess(skipIncrement) {
    clearTimeout(failVideoTimeoutID)
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

    setZihuy(false)
}

function onSuccessVideoEnded() {
    let successVideoElm = document.querySelector('video#success-video')
    successVideoElm.removeEventListener('ended', onSuccessVideoEnded)
    successVideoElm.classList.add('hidden')
    successVideoElm.load()
    let currLetter =  String.fromCharCode(1488+currChallangeIndex+skippedLettersOffset);
    document.getElementById('letter').innerHTML = currLetter
    let videoElm = document.getElementById('letter-video')
    videoElm.classList.remove('hidden')
    videoElm.src = `videos/${currLetter}.mp4`
    videoElm.play()

    let loadBarSpriteElm = document.querySelector('.load-bar-container img.sprite')
    loadBarSpriteElm.src = `./assets/sprite/${currLetter}.png`

    failVideoTimeoutID = setTimeout(goToFailVideo, failVideoIntervalTime)
    setTimeout(setZihuy, 6000, true)
}

function setZihuy(value) {
    canSucceed = value
    let loadBarElm = document.querySelector('.load-bar-container')
    if (value) loadBarElm.classList.remove('hidden')
    else loadBarElm.classList.add('hidden')
}