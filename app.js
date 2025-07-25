class RepTracker {
    constructor() {
        this.video = document.getElementById('videoElement');
        this.canvas = document.getElementById('poseCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.repCount = 0;
        this.isTracking = false;
        this.currentExercise = 'pushup';
        this.pose = null;
        this.lastPosition = null;
        this.exerciseState = 'up'; // 'up' or 'down'
        this.lastStateChange = 0;
        
        this.initializeElements();
        this.setupEventListeners();
    }
    
    initializeElements() {
        this.repCountElement = document.getElementById('repCount');
        this.exerciseSelect = document.getElementById('exerciseSelect');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.statusMessage = document.getElementById('statusMessage');
        this.debugInfo = document.getElementById('debugInfo');
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startWorkout());
        this.stopBtn.addEventListener('click', () => this.stopWorkout());
        this.resetBtn.addEventListener('click', () => this.resetCounter());
        this.exerciseSelect.addEventListener('change', (e) => {
            this.currentExercise = e.target.value;
            this.resetCounter();
        });
    }
    
    async startWorkout() {
        try {
            await this.initializeCamera();
            await this.initializePoseDetection();
            this.isTracking = true;
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.updateStatus('Workout started! Get in position...');
        } catch (error) {
            console.error('Error starting workout:', error);
            this.updateStatus('Error accessing camera. Please check permissions.');
        }
    }
    
    stopWorkout() {
        this.isTracking = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.updateStatus('Workout stopped');
        
        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
        }
    }
    
    resetCounter() {
        this.repCount = 0;
        this.updateRepCount();
        this.exerciseState = 'up';
        this.lastStateChange = 0;
        this.updateStatus('Counter reset. Ready to start!');
    }
    
    async initializeCamera() {
        const constraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            }
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.video.srcObject = stream;
        
        return new Promise((resolve) => {
            this.video.onloadedmetadata = () => {
                this.video.play();
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                resolve();
            };
        });
    }
    
    async initializePoseDetection() {
        if (typeof Pose === 'undefined') {
            throw new Error('MediaPipe Pose library not loaded');
        }
        
        this.pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
            }
        });
        
        this.pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        this.pose.onResults((results) => this.onPoseResults(results));
        
        this.detectPose();
    }
    
    async detectPose() {
        if (this.isTracking && this.video.readyState >= 2) {
            await this.pose.send({ image: this.video });
        }
        requestAnimationFrame(() => this.detectPose());
    }
    
    onPoseResults(results) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (results.poseLandmarks) {
            this.drawPose(results.poseLandmarks);
            this.analyzeExercise(results.poseLandmarks);
        }
    }
    
    drawPose(landmarks) {
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = '#FF0000';
        
        // Draw key points
        const keyPoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
        keyPoints.forEach(index => {
            if (landmarks[index]) {
                const x = landmarks[index].x * this.canvas.width;
                const y = landmarks[index].y * this.canvas.height;
                this.ctx.beginPath();
                this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
                this.ctx.fill();
            }
        });
        
        // Draw connections
        const connections = [
            [11, 12], [11, 13], [12, 14], [13, 15], [14, 16],
            [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
            [25, 27], [26, 28]
        ];
        
        connections.forEach(([start, end]) => {
            if (landmarks[start] && landmarks[end]) {
                this.ctx.beginPath();
                this.ctx.moveTo(
                    landmarks[start].x * this.canvas.width,
                    landmarks[start].y * this.canvas.height
                );
                this.ctx.lineTo(
                    landmarks[end].x * this.canvas.width,
                    landmarks[end].y * this.canvas.height
                );
                this.ctx.stroke();
            }
        });
    }
    
    analyzeExercise(landmarks) {
        switch (this.currentExercise) {
            case 'pushup':
                this.analyzePushup(landmarks);
                break;
            case 'squat':
                this.analyzeSquat(landmarks);
                break;
        }
    }
    
    analyzePushup(landmarks) {
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        
        if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist) {
            this.updateDebug('Missing landmarks for push-up detection');
            return;
        }
        
        const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
        const wristY = (leftWrist.y + rightWrist.y) / 2;
        const diff = wristY - shoulderY;
        
        this.updateDebug(`Push-up: diff=${diff.toFixed(3)}, state=${this.exerciseState}, shoulderY=${shoulderY.toFixed(3)}, wristY=${wristY.toFixed(3)}`);
        
        // State machine logic with timing check to prevent rapid changes
        const now = Date.now();
        if (this.exerciseState === 'up' && diff > 0.02 && (now - this.lastStateChange) > 500) {
            this.exerciseState = 'down';
            this.lastStateChange = now;
            this.updateStatus('Going down...');
            console.log('Push-up: Changed to DOWN state');
        } else if (this.exerciseState === 'down' && diff < -0.005 && (now - this.lastStateChange) > 500) {
            this.exerciseState = 'up';
            this.lastStateChange = now;
            this.repCount++;
            this.updateRepCount();
            this.updateStatus(`Push-up completed! Rep ${this.repCount}`);
            console.log('Push-up: Changed to UP state, rep counted');
        }
    }
    
    analyzeSquat(landmarks) {
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        const leftKnee = landmarks[25];
        const rightKnee = landmarks[26];
        
        if (!leftHip || !rightHip || !leftKnee || !rightKnee) {
            this.updateDebug('Missing landmarks for squat detection');
            return;
        }
        
        const hipY = (leftHip.y + rightHip.y) / 2;
        const kneeY = (leftKnee.y + rightKnee.y) / 2;
        const diff = kneeY - hipY;
        
        this.updateDebug(`Squat: diff=${diff.toFixed(3)}, state=${this.exerciseState}, hipY=${hipY.toFixed(3)}, kneeY=${kneeY.toFixed(3)}`);
        
        // State machine: up -> down -> up = 1 rep with timing check
        const now = Date.now();
        if (this.exerciseState === 'up' && diff < 0.03 && (now - this.lastStateChange) > 500) {
            this.exerciseState = 'down';
            this.lastStateChange = now;
            this.updateStatus('Going down...');
            console.log('Squat: Changed to DOWN state');
        } else if (this.exerciseState === 'down' && diff > 0.06 && (now - this.lastStateChange) > 500) {
            this.exerciseState = 'up';
            this.lastStateChange = now;
            this.repCount++;
            this.updateRepCount();
            this.updateStatus(`Squat completed! Rep ${this.repCount}`);
            console.log('Squat: Changed to UP state, rep counted');
        }
    }
    
    
    calculateAngle(a, b, c) {
        const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        let angle = Math.abs(radians * 180.0 / Math.PI);
        if (angle > 180.0) {
            angle = 360 - angle;
        }
        return angle;
    }
    
    updateRepCount() {
        this.repCountElement.textContent = this.repCount;
    }
    
    updateStatus(message) {
        this.statusMessage.textContent = message;
    }
    
    updateDebug(message) {
        if (this.debugInfo) {
            this.debugInfo.textContent = message;
        }
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new RepTracker();
});