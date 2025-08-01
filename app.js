class StrongWorkoutTracker {
    constructor() {
        this.video = document.getElementById('videoElement');
        this.canvas = document.getElementById('poseCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.pose = null;
        
        // Workout State
        this.workoutState = 'setup'; // 'setup', 'active', 'rest', 'summary'
        this.selectedExercises = [];
        this.currentExerciseIndex = 0;
        this.currentSetNumber = 1;
        this.currentRepCount = 0;
        this.completedSets = [];
        this.workoutStartTime = null;
        this.setStartTime = null;
        this.restStartTime = null;
        this.restDuration = 90; // seconds
        
        // Exercise Detection State
        this.isTracking = false;
        this.exerciseState = 'up';
        this.lastStateChange = 0;
        this.isVideoVisible = true;
        
        // Exercise Definitions
        this.exercises = {
            pushup: { name: 'Push-ups', icon: '💪', muscles: 'Chest, shoulders, triceps' },
            squat: { name: 'Squats', icon: '🦵', muscles: 'Legs, glutes, core' },
            situp: { name: 'Sit-ups', icon: '🔥', muscles: 'Core, abs' }
        };
        
        this.initializeElements();
        this.setupEventListeners();
        this.showExerciseSelection();
    }
    
    initializeElements() {
        // Screen elements
        this.exerciseSelectionScreen = document.getElementById('exerciseSelection');
        this.workoutSessionScreen = document.getElementById('workoutSession');
        this.workoutSummaryScreen = document.getElementById('workoutSummary');
        
        // Exercise selection
        this.exerciseCards = document.querySelectorAll('.exercise-card');
        this.startWorkoutBtn = document.getElementById('startWorkoutBtn');
        
        // Workout session
        this.currentExerciseName = document.getElementById('currentExerciseName');
        this.currentSetNumber = document.getElementById('currentSetNumber');
        this.currentRepCountDisplay = document.getElementById('currentRepCount');
        this.setsDisplay = document.getElementById('setsDisplay');
        this.nextExercisesList = document.getElementById('nextExercises');
        
        // Set controls
        this.startSetBtn = document.getElementById('startSetBtn');
        this.finishSetBtn = document.getElementById('finishSetBtn');
        this.finishExerciseBtn = document.getElementById('finishExerciseBtn');
        this.manualRepBtn = document.getElementById('manualRepBtn');
        
        // Timer and status
        this.workoutTimer = document.getElementById('workoutTimer');
        this.statusMessage = document.getElementById('statusMessage');
        this.restTimer = document.getElementById('restTimer');
        this.restTimeDisplay = document.getElementById('restTimeDisplay');
        
        // Video controls
        this.videoSection = document.getElementById('videoSection');
        this.toggleVideoBtn = document.getElementById('toggleVideoBtn');
        
        // Debug
        this.debugPanel = document.getElementById('debugPanel');
        this.debugToggleBtn = document.getElementById('toggleDebugBtn');
        this.debugInfo = document.getElementById('debugInfo');
        this.debugContent = document.querySelector('.debug-content');
        
        // Form Feedback
        this.formFeedback = document.getElementById('formFeedback');
        this.exerciseTitle = document.getElementById('exerciseTitle');
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        this.angleLabel = document.getElementById('angleLabel');
        this.armAngleDisplay = document.getElementById('armAngle');
        this.positionValueDisplay = document.getElementById('positionValue');
        this.exerciseStateDisplay = document.getElementById('exerciseStateDisplay');
        this.formGuidance = document.getElementById('formGuidance');
        
        // Summary
        this.totalDurationDisplay = document.getElementById('totalDuration');
        this.totalSetsDisplay = document.getElementById('totalSets');
        this.totalRepsDisplay = document.getElementById('totalReps');
        this.exerciseSummaryDisplay = document.getElementById('exerciseSummary');
        this.finishWorkoutBtn = document.getElementById('finishWorkoutBtn');
    }
    
    setupEventListeners() {
        // Exercise selection
        this.exerciseCards.forEach(card => {
            card.addEventListener('click', () => this.toggleExerciseSelection(card));
        });
        this.startWorkoutBtn.addEventListener('click', () => this.startWorkout());
        
        // Set controls
        this.startSetBtn.addEventListener('click', () => this.startSet());
        this.finishSetBtn.addEventListener('click', () => this.finishSet());
        this.finishExerciseBtn.addEventListener('click', () => this.finishExercise());
        this.manualRepBtn.addEventListener('click', () => this.addManualRep());
        
        // Video controls
        this.toggleVideoBtn.addEventListener('click', () => this.toggleVideo());
        
        // Rest timer
        document.getElementById('skipRestBtn').addEventListener('click', () => this.skipRest());
        document.getElementById('addTimeBtn').addEventListener('click', () => this.addRestTime());
        
        // Debug
        this.debugToggleBtn.addEventListener('click', () => this.toggleDebug());
        
        // Summary
        this.finishWorkoutBtn.addEventListener('click', () => this.resetToStart());
        
        // Back button
        document.getElementById('backBtn').addEventListener('click', () => this.goBack());
    }
    
    // Exercise Selection Methods
    showExerciseSelection() {
        this.workoutState = 'setup';
        this.exerciseSelectionScreen.classList.remove('hidden');
        this.workoutSessionScreen.classList.add('hidden');
        this.workoutSummaryScreen.classList.add('hidden');
        this.videoSection.classList.add('hidden');
        this.updateStatus('Select exercises to start your workout');
    }
    
    toggleExerciseSelection(card) {
        const exerciseType = card.dataset.exercise;
        card.classList.toggle('selected');
        
        if (this.selectedExercises.includes(exerciseType)) {
            this.selectedExercises = this.selectedExercises.filter(ex => ex !== exerciseType);
        } else {
            this.selectedExercises.push(exerciseType);
        }
        
        this.startWorkoutBtn.disabled = this.selectedExercises.length === 0;
        
        if (this.selectedExercises.length > 0) {
            this.updateStatus(`${this.selectedExercises.length} exercise${this.selectedExercises.length > 1 ? 's' : ''} selected`);
        } else {
            this.updateStatus('Select exercises to start your workout');
        }
    }
    
    // Workout Flow Methods
    async startWorkout() {
        if (this.selectedExercises.length === 0) return;
        
        this.workoutState = 'active';
        this.workoutStartTime = Date.now();
        this.currentExerciseIndex = 0;
        this.currentSetNumber = 1;
        this.completedSets = [];
        
        // Show workout session screen
        this.exerciseSelectionScreen.classList.add('hidden');
        this.workoutSessionScreen.classList.remove('hidden');
        this.videoSection.classList.remove('hidden');
        
        // Initialize camera and pose detection
        try {
            await this.initializeCamera();
            await this.initializePoseDetection();
            this.updateStatus('Camera ready! Click "Start Set" to begin tracking.');
        } catch (error) {
            console.error('Error initializing camera:', error);
            this.updateStatus('Camera initialization failed. You can still use manual counting.');
        }
        
        this.updateWorkoutDisplay();
        this.startWorkoutTimer();
    }
    
    startSet() {
        this.currentRepCount = 0;
        this.exerciseState = 'up';
        this.lastStateChange = 0;
        this.setStartTime = Date.now();
        this.isTracking = true;
        
        this.startSetBtn.classList.add('hidden');
        this.finishSetBtn.classList.remove('hidden');
        
        this.updateCurrentRepDisplay();
        this.updateStatus(`Set ${this.currentSetNumber} started! Begin your ${this.getCurrentExercise().name.toLowerCase()}.`);
    }
    
    finishSet() {
        this.isTracking = false;
        const setDuration = Date.now() - this.setStartTime;
        
        // Record the completed set
        const setData = {
            exercise: this.selectedExercises[this.currentExerciseIndex],
            setNumber: this.currentSetNumber,
            reps: this.currentRepCount,
            duration: setDuration,
            isAuto: this.currentRepCount > 0 // Assume auto if reps were counted
        };
        
        this.completedSets.push(setData);
        this.addSetToDisplay(setData);
        
        this.startSetBtn.classList.remove('hidden');
        this.finishSetBtn.classList.add('hidden');
        
        this.currentSetNumber++;
        this.updateWorkoutDisplay();
        
        // Start rest timer
        this.startRestTimer();
        
        this.updateStatus(`Set complete! ${this.currentRepCount} reps recorded. Take a rest.`);
    }
    
    finishExercise() {
        this.isTracking = false;
        this.currentExerciseIndex++;
        this.currentSetNumber = 1;
        
        if (this.currentExerciseIndex >= this.selectedExercises.length) {
            this.finishWorkout();
        } else {
            this.updateWorkoutDisplay();
            this.updateStatus(`${this.getCurrentExercise().name} complete! Moving to next exercise.`);
        }
    }
    
    finishWorkout() {
        this.workoutState = 'summary';
        this.isTracking = false;
        
        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
        }
        
        this.workoutSessionScreen.classList.add('hidden');
        this.workoutSummaryScreen.classList.remove('hidden');
        this.videoSection.classList.add('hidden');
        
        this.displayWorkoutSummary();
    }
    
    // Set Management Methods
    addSetToDisplay(setData) {
        const setRow = document.createElement('div');
        setRow.className = 'set-row';
        setRow.innerHTML = `
            <span class="set-number">Set ${setData.setNumber}</span>
            <span class="set-reps">${setData.reps}</span>
            <span class="set-type">${setData.isAuto ? 'Auto' : 'Manual'}</span>
        `;
        this.setsDisplay.appendChild(setRow);
    }
    
    addManualRep() {
        if (this.isTracking) {
            this.currentRepCount++;
            this.updateCurrentRepDisplay();
            this.updateStatus(`Manual rep added. Total: ${this.currentRepCount}`);
        }
    }
    
    // Timer Methods
    startWorkoutTimer() {
        this.workoutTimerInterval = setInterval(() => {
            if (this.workoutStartTime) {
                const elapsed = Date.now() - this.workoutStartTime;
                this.workoutTimer.textContent = this.formatTime(elapsed);
            }
        }, 1000);
    }
    
    startRestTimer() {
        this.restStartTime = Date.now();
        this.restTimer.classList.remove('hidden');
        
        this.restTimerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.restStartTime) / 1000);
            const remaining = Math.max(0, this.restDuration - elapsed);
            
            this.restTimeDisplay.textContent = this.formatTimeSeconds(remaining);
            
            if (remaining === 0) {
                this.skipRest();
            }
        }, 1000);
    }
    
    skipRest() {
        this.restTimer.classList.add('hidden');
        if (this.restTimerInterval) {
            clearInterval(this.restTimerInterval);
        }
        this.updateStatus('Rest complete! Ready for next set.');
    }
    
    addRestTime() {
        this.restDuration += 30;
    }
    
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    formatTimeSeconds(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    // Display Update Methods
    updateWorkoutDisplay() {
        const currentExercise = this.getCurrentExercise();
        this.currentExerciseName.textContent = currentExercise.name;
        this.currentSetNumber.textContent = this.currentSetNumber;
        this.updateCurrentRepDisplay();
        this.updateNextExercises();
        
        // Update form feedback overlay
        if (this.exerciseTitle) {
            this.exerciseTitle.textContent = currentExercise.name;
        }
        
        // Update angle label based on exercise
        if (this.angleLabel) {
            const exerciseType = this.selectedExercises[this.currentExerciseIndex];
            switch (exerciseType) {
                case 'pushup':
                    this.angleLabel.textContent = 'Arm Angle:';
                    break;
                case 'squat':
                    this.angleLabel.textContent = 'Knee Angle:';
                    break;
                case 'situp':
                    this.angleLabel.textContent = 'Torso Angle:';
                    break;
                default:
                    this.angleLabel.textContent = 'Angle:';
            }
        }
    }
    
    updateCurrentRepDisplay() {
        this.currentRepCountDisplay.textContent = this.currentRepCount;
    }
    
    updateNextExercises() {
        this.nextExercisesList.innerHTML = '';
        
        for (let i = this.currentExerciseIndex + 1; i < this.selectedExercises.length; i++) {
            const exercise = this.exercises[this.selectedExercises[i]];
            const item = document.createElement('div');
            item.className = 'next-exercise-item';
            item.innerHTML = `
                <span class="next-exercise-icon">${exercise.icon}</span>
                <span class="next-exercise-name">${exercise.name}</span>
            `;
            this.nextExercisesList.appendChild(item);
        }
    }
    
    displayWorkoutSummary() {
        const totalDuration = Date.now() - this.workoutStartTime;
        const totalSets = this.completedSets.length;
        const totalReps = this.completedSets.reduce((sum, set) => sum + set.reps, 0);
        
        this.totalDurationDisplay.textContent = this.formatTime(totalDuration);
        this.totalSetsDisplay.textContent = totalSets;
        this.totalRepsDisplay.textContent = totalReps;
        
        // Group sets by exercise
        const exerciseGroups = {};
        this.completedSets.forEach(set => {
            if (!exerciseGroups[set.exercise]) {
                exerciseGroups[set.exercise] = { sets: 0, reps: 0 };
            }
            exerciseGroups[set.exercise].sets++;
            exerciseGroups[set.exercise].reps += set.reps;
        });
        
        this.exerciseSummaryDisplay.innerHTML = '';
        Object.entries(exerciseGroups).forEach(([exerciseType, stats]) => {
            const exercise = this.exercises[exerciseType];
            const item = document.createElement('div');
            item.className = 'exercise-summary-item';
            item.innerHTML = `
                <span class="exercise-summary-name">${exercise.name}</span>
                <span class="exercise-summary-stats">${stats.sets} sets, ${stats.reps} reps</span>
            `;
            this.exerciseSummaryDisplay.appendChild(item);
        });
    }
    
    // Utility Methods
    getCurrentExercise() {
        const exerciseType = this.selectedExercises[this.currentExerciseIndex];
        return this.exercises[exerciseType];
    }
    
    updateStatus(message) {
        this.statusMessage.textContent = message;
    }
    
    toggleVideo() {
        this.isVideoVisible = !this.isVideoVisible;
        
        if (this.isVideoVisible) {
            this.videoSection.classList.remove('hidden');
            this.toggleVideoBtn.textContent = 'Hide Camera';
        } else {
            this.videoSection.classList.add('hidden');
            this.toggleVideoBtn.textContent = 'Show Camera';
        }
    }
    
    toggleDebug() {
        this.debugContent.classList.toggle('hidden');
    }
    
    updateDebug(message) {
        if (this.debugInfo) {
            this.debugInfo.textContent = message;
        }
    }
    
    updateFormFeedback(data) {
        if (!this.formFeedback) return;
        
        const {
            angle = null,
            position = null,
            state = 'ready',
            landmarksDetected = 0,
            totalLandmarks = 0,
            guidance = 'Position yourself for the exercise'
        } = data;
        
        // Update metrics
        if (this.armAngleDisplay) {
            this.armAngleDisplay.textContent = angle !== null ? `${angle.toFixed(1)}°` : '--°';
        }
        
        if (this.positionValueDisplay) {
            this.positionValueDisplay.textContent = position !== null ? position.toFixed(3) : '--';
        }
        
        if (this.exerciseStateDisplay) {
            this.exerciseStateDisplay.textContent = state.charAt(0).toUpperCase() + state.slice(1);
        }
        
        // Update detection status
        const detectionQuality = totalLandmarks > 0 ? landmarksDetected / totalLandmarks : 0;
        
        if (this.statusDot && this.statusText) {
            this.statusDot.className = 'status-dot';
            
            if (detectionQuality >= 0.8) {
                this.statusDot.classList.add('detecting');
                this.statusText.textContent = 'Good Detection';
            } else if (detectionQuality >= 0.5) {
                this.statusDot.classList.add('partial');
                this.statusText.textContent = 'Partial Detection';
            } else {
                this.statusText.textContent = 'Position Yourself';
            }
        }
        
        // Update guidance
        if (this.formGuidance) {
            const guidanceElement = this.formGuidance.querySelector('p');
            if (guidanceElement) {
                guidanceElement.textContent = guidance;
            }
            
            // Update guidance styling based on detection quality
            this.formGuidance.className = 'form-guidance';
            if (detectionQuality >= 0.8) {
                this.formGuidance.classList.add('success');
            } else if (detectionQuality >= 0.5) {
                this.formGuidance.classList.add('warning');
            }
        }
    }
    
    goBack() {
        if (this.workoutState === 'active') {
            if (confirm('Are you sure you want to end this workout?')) {
                this.resetToStart();
            }
        } else {
            this.resetToStart();
        }
    }
    
    resetToStart() {
        // Clear intervals
        if (this.workoutTimerInterval) clearInterval(this.workoutTimerInterval);
        if (this.restTimerInterval) clearInterval(this.restTimerInterval);
        
        // Stop camera
        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
        }
        
        // Reset state
        this.workoutState = 'setup';
        this.selectedExercises = [];
        this.currentExerciseIndex = 0;
        this.currentSetNumber = 1;
        this.currentRepCount = 0;
        this.completedSets = [];
        this.isTracking = false;
        
        // Clear selections
        this.exerciseCards.forEach(card => card.classList.remove('selected'));
        this.setsDisplay.innerHTML = '';
        
        // Show exercise selection
        this.showExerciseSelection();
    }
    
    // Camera and Pose Detection Methods (from original code)
    async initializeCamera() {
        try {
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = stream;
            
            return new Promise((resolve, reject) => {
                this.video.onloadedmetadata = () => {
                    this.video.play().then(() => {
                        // Wait a moment for video to fully load
                        setTimeout(() => {
                            this.canvas.width = this.video.videoWidth;
                            this.canvas.height = this.video.videoHeight;
                            console.log('Camera initialized:', this.video.videoWidth, 'x', this.video.videoHeight);
                            resolve();
                        }, 500);
                    }).catch(reject);
                };
                
                this.video.onerror = (error) => {
                    console.error('Video error:', error);
                    reject(error);
                };
            });
        } catch (error) {
            console.error('Camera initialization error:', error);
            throw error;
        }
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
        
        // Start pose detection loop immediately
        console.log('Starting pose detection...');
        this.detectPose();
    }
    
    async detectPose() {
        if (this.pose && this.video && this.video.readyState >= 2) {
            try {
                await this.pose.send({ image: this.video });
            } catch (error) {
                console.error('Pose detection error:', error);
            }
        }
        requestAnimationFrame(() => this.detectPose());
    }
    
    onPoseResults(results) {
        if (!this.ctx || !this.canvas) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (results.poseLandmarks) {
            this.drawPose(results.poseLandmarks);
            
            // Only analyze exercise if we're actively tracking
            if (this.isTracking && this.workoutState === 'active') {
                this.analyzeExercise(results.poseLandmarks);
            }
        }
    }
    
    drawPose(landmarks) {
        if (!this.ctx || !landmarks || landmarks.length === 0) return;
        
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = '#FF0000';
        
        // Draw key points
        const keyPoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
        let visiblePoints = 0;
        
        keyPoints.forEach(index => {
            if (landmarks[index] && landmarks[index].visibility > 0.5) {
                const x = landmarks[index].x * this.canvas.width;
                const y = landmarks[index].y * this.canvas.height;
                this.ctx.beginPath();
                this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
                this.ctx.fill();
                visiblePoints++;
            }
        });
        
        // Draw connections
        const connections = [
            [11, 12], [11, 13], [12, 14], [13, 15], [14, 16],
            [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
            [25, 27], [26, 28]
        ];
        
        connections.forEach(([start, end]) => {
            if (landmarks[start] && landmarks[end] && 
                landmarks[start].visibility > 0.5 && landmarks[end].visibility > 0.5) {
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
        
        // Update debug info with pose quality
        if (!this.isTracking) {
            this.updateDebug(`Pose detected: ${visiblePoints} visible points`);
        }
    }
    
    analyzeExercise(landmarks) {
        if (!this.selectedExercises || this.currentExerciseIndex >= this.selectedExercises.length) {
            return;
        }
        
        const currentExerciseType = this.selectedExercises[this.currentExerciseIndex];
        
        switch (currentExerciseType) {
            case 'pushup':
                this.analyzePushup(landmarks);
                break;
            case 'squat':
                this.analyzeSquat(landmarks);
                break;
            case 'situp':
                this.analyzeSitup(landmarks);
                break;
        }
    }
    
    analyzePushup(landmarks) {
        const requiredLandmarks = [11, 12, 13, 14]; // shoulders and elbows
        const optionalLandmarks = [15, 16]; // wrists
        
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftElbow = landmarks[13];
        const rightElbow = landmarks[14];
        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        
        // Count visible landmarks for feedback
        let visibleRequired = 0;
        let visibleOptional = 0;
        
        requiredLandmarks.forEach(idx => {
            if (landmarks[idx] && landmarks[idx].visibility > 0.5) visibleRequired++;
        });
        
        optionalLandmarks.forEach(idx => {
            if (landmarks[idx] && landmarks[idx].visibility > 0.5) visibleOptional++;
        });
        
        const totalVisible = visibleRequired + visibleOptional;
        const totalLandmarks = requiredLandmarks.length + optionalLandmarks.length;
        
        // Generate guidance based on detection quality
        let guidance = 'Position yourself for push-ups';
        if (visibleRequired < 4) {
            guidance = 'Make sure your shoulders and elbows are visible to the camera';
        } else if (visibleOptional < 2) {
            guidance = 'Try to keep your wrists visible for better detection';
        } else if (this.isTracking) {
            guidance = 'Great! Perform push-ups with full range of motion';
        }
        
        if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow ||
            leftShoulder.visibility < 0.5 || rightShoulder.visibility < 0.5 ||
            leftElbow.visibility < 0.5 || rightElbow.visibility < 0.5) {
            
            this.updateFormFeedback({
                angle: null,
                position: null,
                state: 'ready',
                landmarksDetected: totalVisible,
                totalLandmarks: totalLandmarks,
                guidance: guidance
            });
            return;
        }
        
        // Calculate arm angle (more reliable for pushups)
        let leftAngle = 180, rightAngle = 180;
        
        if (leftWrist && leftWrist.visibility > 0.5) {
            leftAngle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);
        }
        if (rightWrist && rightWrist.visibility > 0.5) {
            rightAngle = this.calculateAngle(rightShoulder, rightElbow, rightWrist);
        }
        
        const avgAngle = (leftAngle + rightAngle) / 2;
        
        // Fallback to position-based detection
        const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
        const elbowY = (leftElbow.y + rightElbow.y) / 2;
        const positionDiff = elbowY - shoulderY;
        
        // Enhanced guidance based on current position
        if (this.isTracking) {
            if (avgAngle < 180) {
                if (avgAngle < 90) {
                    guidance = 'Arms very bent - push up to complete the rep!';
                } else if (avgAngle < 110) {
                    guidance = 'Good down position - now push up!';
                } else if (avgAngle > 140) {
                    guidance = 'Good up position - lower down for next rep';
                } else {
                    guidance = 'Mid-range - continue the movement';
                }
            } else {
                guidance = 'Keep your arms in view for angle detection';
            }
        }
        
        // Update form feedback
        this.updateFormFeedback({
            angle: avgAngle < 180 ? avgAngle : null,
            position: positionDiff,
            state: this.exerciseState,
            landmarksDetected: totalVisible,
            totalLandmarks: totalLandmarks,
            guidance: guidance
        });
        
        this.updateDebug(`Push-up: angle=${avgAngle.toFixed(1)}°, posDiff=${positionDiff.toFixed(3)}, state=${this.exerciseState}, reps=${this.currentRepCount}`);
        
        const now = Date.now();
        
        // Use angle-based detection (more reliable)
        if (avgAngle < 180) { // Valid angle measurement available
            if (this.exerciseState === 'up' && avgAngle < 110 && (now - this.lastStateChange) > 400) {
                this.exerciseState = 'down';
                this.lastStateChange = now;
                console.log('Push-up: Going DOWN (angle method), angle:', avgAngle);
            } else if (this.exerciseState === 'down' && avgAngle > 140 && (now - this.lastStateChange) > 400) {
                this.exerciseState = 'up';
                this.lastStateChange = now;
                this.currentRepCount++;
                this.updateCurrentRepDisplay();
                console.log('Push-up: Going UP (angle method), rep counted:', this.currentRepCount);
            }
        } else {
            // Fallback to position-based detection with more sensitive thresholds
            if (this.exerciseState === 'up' && positionDiff > 0.03 && (now - this.lastStateChange) > 400) {
                this.exerciseState = 'down';
                this.lastStateChange = now;
                console.log('Push-up: Going DOWN (position method), diff:', positionDiff);
            } else if (this.exerciseState === 'down' && positionDiff < 0.01 && (now - this.lastStateChange) > 400) {
                this.exerciseState = 'up';
                this.lastStateChange = now;
                this.currentRepCount++;
                this.updateCurrentRepDisplay();
                console.log('Push-up: Going UP (position method), rep counted:', this.currentRepCount);
            }
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
    
    analyzeSquat(landmarks) {
        const requiredLandmarks = [23, 24, 25, 26]; // hips and knees
        const optionalLandmarks = [27, 28]; // ankles
        
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        const leftKnee = landmarks[25];
        const rightKnee = landmarks[26];
        const leftAnkle = landmarks[27];
        const rightAnkle = landmarks[28];
        
        // Count visible landmarks for feedback
        let visibleRequired = 0;
        let visibleOptional = 0;
        
        requiredLandmarks.forEach(idx => {
            if (landmarks[idx] && landmarks[idx].visibility > 0.5) visibleRequired++;
        });
        
        optionalLandmarks.forEach(idx => {
            if (landmarks[idx] && landmarks[idx].visibility > 0.5) visibleOptional++;
        });
        
        const totalVisible = visibleRequired + visibleOptional;
        const totalLandmarks = requiredLandmarks.length + optionalLandmarks.length;
        
        // Generate guidance based on detection quality
        let guidance = 'Position yourself for squats';
        if (visibleRequired < 4) {
            guidance = 'Make sure your hips and knees are visible to the camera';
        } else if (visibleOptional < 2) {
            guidance = 'Try to keep your ankles visible for better detection';
        } else if (this.isTracking) {
            guidance = 'Great! Perform squats with proper depth';
        }
        
        if (!leftHip || !rightHip || !leftKnee || !rightKnee ||
            leftHip.visibility < 0.5 || rightHip.visibility < 0.5 ||
            leftKnee.visibility < 0.5 || rightKnee.visibility < 0.5) {
            
            this.updateFormFeedback({
                angle: null,
                position: null,
                state: 'ready',
                landmarksDetected: totalVisible,
                totalLandmarks: totalLandmarks,
                guidance: guidance
            });
            return;
        }
        
        const hipY = (leftHip.y + rightHip.y) / 2;
        const kneeY = (leftKnee.y + rightKnee.y) / 2;
        const diff = kneeY - hipY;
        
        // Calculate knee angle if ankles are visible
        let leftKneeAngle = null, rightKneeAngle = null;
        if (leftAnkle && leftAnkle.visibility > 0.5) {
            leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
        }
        if (rightAnkle && rightAnkle.visibility > 0.5) {
            rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
        }
        
        const avgKneeAngle = leftKneeAngle && rightKneeAngle ? (leftKneeAngle + rightKneeAngle) / 2 : null;
        
        // Enhanced guidance based on current position
        if (this.isTracking) {
            if (diff < -0.05) {
                guidance = 'Very deep squat - push up to complete the rep!';
            } else if (diff < 0.03) {
                guidance = 'Good squat depth - now stand up!';
            } else if (diff > 0.08) {
                guidance = 'Standing position - lower down for next rep';
            } else {
                guidance = 'Mid-range - continue the movement';
            }
        }
        
        // Update form feedback
        this.updateFormFeedback({
            angle: avgKneeAngle,
            position: diff,
            state: this.exerciseState,
            landmarksDetected: totalVisible,
            totalLandmarks: totalLandmarks,
            guidance: guidance
        });
        
        this.updateDebug(`Squat: diff=${diff.toFixed(3)}, kneeAngle=${avgKneeAngle ? avgKneeAngle.toFixed(1) + '°' : 'N/A'}, state=${this.exerciseState}, reps=${this.currentRepCount}`);
        
        const now = Date.now();
        if (this.exerciseState === 'up' && diff < 0.03 && (now - this.lastStateChange) > 500) {
            this.exerciseState = 'down';
            this.lastStateChange = now;
            console.log('Squat: Going DOWN, diff:', diff);
        } else if (this.exerciseState === 'down' && diff > 0.06 && (now - this.lastStateChange) > 500) {
            this.exerciseState = 'up';
            this.lastStateChange = now;
            this.currentRepCount++;
            this.updateCurrentRepDisplay();
            console.log('Squat: Going UP, rep counted:', this.currentRepCount);
        }
    }
    
    analyzeSitup(landmarks) {
        const requiredLandmarks = [11, 12, 23, 24]; // shoulders and hips
        const optionalLandmarks = [0, 25, 26]; // nose and knees
        
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        const nose = landmarks[0];
        const leftKnee = landmarks[25];
        const rightKnee = landmarks[26];
        
        // Count visible landmarks for feedback
        let visibleRequired = 0;
        let visibleOptional = 0;
        
        requiredLandmarks.forEach(idx => {
            if (landmarks[idx] && landmarks[idx].visibility > 0.5) visibleRequired++;
        });
        
        optionalLandmarks.forEach(idx => {
            if (landmarks[idx] && landmarks[idx].visibility > 0.5) visibleOptional++;
        });
        
        const totalVisible = visibleRequired + visibleOptional;
        const totalLandmarks = requiredLandmarks.length + optionalLandmarks.length;
        
        // Generate guidance based on detection quality
        let guidance = 'Position yourself for sit-ups';
        if (visibleRequired < 4) {
            guidance = 'Make sure your shoulders and hips are visible to the camera';
        } else if (visibleOptional < 2) {
            guidance = 'Try to keep your head and knees visible for better detection';
        } else if (this.isTracking) {
            guidance = 'Great! Perform sit-ups with controlled movement';
        }
        
        if (!leftShoulder || !rightShoulder || !leftHip || !rightHip ||
            leftShoulder.visibility < 0.5 || rightShoulder.visibility < 0.5 ||
            leftHip.visibility < 0.5 || rightHip.visibility < 0.5) {
            
            this.updateFormFeedback({
                angle: null,
                position: null,
                state: 'ready',
                landmarksDetected: totalVisible,
                totalLandmarks: totalLandmarks,
                guidance: guidance
            });
            return;
        }
        
        const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
        const hipY = (leftHip.y + rightHip.y) / 2;
        const diff = shoulderY - hipY;
        
        // Calculate torso angle if nose is visible
        let torsoAngle = null;
        if (nose && nose.visibility > 0.5) {
            const midHip = {
                x: (leftHip.x + rightHip.x) / 2,
                y: (leftHip.y + rightHip.y) / 2
            };
            const midShoulder = {
                x: (leftShoulder.x + rightShoulder.x) / 2,
                y: (leftShoulder.y + rightShoulder.y) / 2
            };
            
            // Calculate angle between torso and vertical
            const torsoVector = { x: midShoulder.x - midHip.x, y: midShoulder.y - midHip.y };
            const verticalVector = { x: 0, y: -1 };
            
            const dotProduct = torsoVector.x * verticalVector.x + torsoVector.y * verticalVector.y;
            const magnitude1 = Math.sqrt(torsoVector.x * torsoVector.x + torsoVector.y * torsoVector.y);
            const magnitude2 = 1; // vertical vector magnitude
            
            torsoAngle = Math.acos(dotProduct / (magnitude1 * magnitude2)) * (180 / Math.PI);
        }
        
        // Enhanced guidance based on current position
        if (this.isTracking) {
            if (diff < -0.15) {
                guidance = 'Lying down - crunch up to complete the rep!';
            } else if (diff < -0.05) {
                guidance = 'Good sit-up position - now lower down!';
            } else if (diff > 0) {
                guidance = 'Sitting up - lower back down for next rep';
            } else {
                guidance = 'Mid-range - continue the movement';
            }
        }
        
        // Update form feedback
        this.updateFormFeedback({
            angle: torsoAngle,
            position: diff,
            state: this.exerciseState,
            landmarksDetected: totalVisible,
            totalLandmarks: totalLandmarks,
            guidance: guidance
        });
        
        this.updateDebug(`Sit-up: diff=${diff.toFixed(3)}, torsoAngle=${torsoAngle ? torsoAngle.toFixed(1) + '°' : 'N/A'}, state=${this.exerciseState}, reps=${this.currentRepCount}`);
        
        const now = Date.now();
        if (this.exerciseState === 'down' && diff < -0.1 && (now - this.lastStateChange) > 500) {
            this.exerciseState = 'up';
            this.lastStateChange = now;
            console.log('Sit-up: Going UP, diff:', diff);
        } else if (this.exerciseState === 'up' && diff > -0.05 && (now - this.lastStateChange) > 500) {
            this.exerciseState = 'down';
            this.lastStateChange = now;
            this.currentRepCount++;
            this.updateCurrentRepDisplay();
            console.log('Sit-up: Going DOWN, rep counted:', this.currentRepCount);
        }
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new StrongWorkoutTracker();
});