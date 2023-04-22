// More API functions here:
// https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/pose

// the link to your model provided by Teachable Machine export panel
const URL = "./my_model/";
let model, webcam, ctx, labelContainer, maxPredictions;
let currChallangeIndex = 0
let loadedModels = false
let hasStarted = false
let skipLetters = ["ך", "ם", "ן", "ף", "ץ"]
let skippedLettersOffset = 0

function pressedButton() {
    // if (mode === POSE_MODE) return
    if (!hasStarted) {
        hasStarted=true
        let videoElm = document.querySelector('video')
        videoElm.classList.remove('hidden')
        videoElm.play()
        document.querySelector('button').classList.add('hidden')
        document.querySelector('.game-container').classList.remove('hidden')
        init()
    }
}

// function switchToPoseMode() {
//     mode = POSE_MODE
//     document.querySelector("video").classList.add("hidden")
//     document.querySelector(".game-container").classList.remove("hidden")
//     window.requestAnimationFrame(loop);
// }

// function switchToViewVideoMode() {
//     mode = VIEW_VIDEO_MODE
//     document.querySelector("video").classList.remove("hidden")
//     document.querySelector(".game-container").classList.add("hidden")
// }

async function init() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

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
    const canvas = document.getElementById("canvas");
    canvas.width = size; canvas.height = size;
    ctx = canvas.getContext("2d");
    labelContainer = document.getElementById("label-container");
    for (let i = 0; i < maxPredictions; i++) { // and class labels
        labelContainer.appendChild(document.createElement("div"));
    }
    loadedModels = true
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
        const labelElm = labelContainer.childNodes[i]
        const classPrediction = prediction[i].className + ": " + prediction[i].probability.toFixed(2);
        labelElm.innerText = classPrediction;
        if (prediction[i].probability >= 0.98) {
          labelElm.classList.add('probable')
          if (i === currChallangeIndex) {
            playerSuccess()
          }
        } else {
          setTimeout(function() {labelElm.classList.remove('probable')}, 3000)
        }
    }
    // finally draw the poses
    // drawPose(pose);
}

function playerSuccess(skipIncrement) {
    if (!skipIncrement) currChallangeIndex++
    let currLetter =  String.fromCharCode(1488+currChallangeIndex+skippedLettersOffset);
    console.log(currLetter);
    if (skipLetters.includes(currLetter)) {
        skippedLettersOffset++
        playerSuccess(true)
        return
    }
    document.getElementById('current-challange').innerText = currLetter
    let videoElm = document.querySelector('video')
    videoElm.src = `videos/${currLetter}.mp4`
    videoElm.play()
    // switchToViewVideoMode()
}

function drawPose(pose) {
    if (webcam.canvas) {
        ctx.drawImage(webcam.canvas, 0, 0);
        // draw the keypoints and skeleton
        if (pose) {
            const minPartConfidence = 0.5;
            tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
            tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
        }
    }
}