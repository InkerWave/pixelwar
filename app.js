// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD8VZkXtKpyL3I2tKcZzdbjtXkl5dmQbmc",
  authDomain: "pixelwar-f7d0d.firebaseapp.com",
  projectId: "pixelwar-f7d0d",
  storageBucket: "pixelwar-f7d0d.firebasestorage.app",
  messagingSenderId: "392216041859",
  appId: "1:392216041859:web:ee14e336bc5f67b059beb6",
  measurementId: "G-791T4BFCSX"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// DOM элементы
const authContainer = document.getElementById('auth-container');
const gameContainer = document.getElementById('game-container');
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const nicknameInput = document.getElementById('nickname'); // Добавьте это поле в HTML
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const pointsDisplay = document.getElementById('points');
const selectedColorDisplay = document.getElementById('selected-color');
const grid = document.getElementById('grid');
const userNicknameDisplay = document.getElementById('user-nickname'); // Добавьте этот элемент в HTML

// Цвета для палитры
const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', 
    '#A52A2A', '#808080'
];

let points = 100;
let selectedColor = '#000000';
let currentUserNickname = '';

// Инициализация
init();

function init() {
    renderColorPalette();
    setupAuthListeners();
    setupPixelGrid();
}

// Рендер палитры цветов
function renderColorPalette() {
    const palette = document.querySelector('.color-palette');
    colors.forEach(color => {
        const colorElement = document.createElement('div');
        colorElement.className = 'color';
        colorElement.style.backgroundColor = color;
        colorElement.dataset.color = color;
        colorElement.addEventListener('click', () => {
            document.querySelectorAll('.color').forEach(c => c.classList.remove('selected'));
            colorElement.classList.add('selected');
            selectedColor = color;
            selectedColorDisplay.style.backgroundColor = color;
        });
        palette.appendChild(colorElement);
    });
    selectedColorDisplay.style.backgroundColor = selectedColor;
}

// Настройка сетки пикселей
function setupPixelGrid() {
    for (let i = 0; i < 50 * 50; i++) {
        const pixel = document.createElement('div');
        pixel.className = 'pixel';
        pixel.dataset.index = i;

        // Слушаем изменения пикселя из Firebase
        database.ref(`pixels/${i}`).on('value', (snapshot) => {
            const pixelData = snapshot.val();
            if (pixelData) {
                pixel.style.backgroundColor = pixelData.color;
                pixel.dataset.owner = pixelData.ownerId;
                pixel.classList.add('occupied');
                
                // Загружаем никнейм владельца
                database.ref(`users/${pixelData.ownerId}/nickname`).once('value').then((nickSnapshot) => {
                    if (nickSnapshot.exists()) {
                        pixel.dataset.ownerNickname = nickSnapshot.val();
                    }
                });
            } else {
                pixel.style.backgroundColor = 'white';
                pixel.classList.remove('occupied');
                delete pixel.dataset.owner;
                delete pixel.dataset.ownerNickname;
            }
        });

        // Обработчик клика по пикселю
        pixel.addEventListener('click', () => {
            const user = auth.currentUser;
            if (!user) return;
            
            if (points > 0 && !pixel.classList.contains('occupied')) {
                database.ref(`pixels/${i}`).set({
                    color: selectedColor,
                    ownerId: user.uid,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
                points--;
                updateUserPoints(user, points);
                pointsDisplay.textContent = points;
            } else if (pixel.classList.contains('occupied')) {
                alert('Этот пиксель уже занят!');
            } else {
                alert('У вас закончились очки!');
            }
        });

        // Показываем никнейм при наведении
        pixel.addEventListener('mouseover', function() {
            if (this.dataset.ownerNickname) {
                const tooltip = document.createElement('div');
                tooltip.className = 'pixel-tooltip';
                tooltip.textContent = this.dataset.ownerNickname;
                this.appendChild(tooltip);
            }
        });

        pixel.addEventListener('mouseout', function() {
            const tooltip = this.querySelector('.pixel-tooltip');
            if (tooltip) {
                this.removeChild(tooltip);
            }
        });

        grid.appendChild(pixel);
    }
}

// Аутентификация
function setupAuthListeners() {
    // Регистрация
    registerBtn.addEventListener('click', () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        const nickname = nicknameInput.value;
        
        if (!nickname) {
            alert('Введите никнейм!');
            return;
        }

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                return database.ref(`users/${user.uid}`).set({
                    points: 100,
                    lastReset: new Date().toDateString(),
                    nickname: nickname,
                    email: email
                });
            })
            .then(() => {
                alert('Регистрация успешна!');
                currentUserNickname = nickname;
                userNicknameDisplay.textContent = nickname;
            })
            .catch(error => alert(error.message));
    });

    // Логин
    loginBtn.addEventListener('click', () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        auth.signInWithEmailAndPassword(email, password)
            .catch(error => alert(error.message));
    });

    // Логаут
    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });

    // Слушатель состояния аутентификации
    auth.onAuthStateChanged(user => {
        if (user) {
            authContainer.style.display = 'none';
            gameContainer.style.display = 'block';
            loadUserData(user);
        } else {
            authContainer.style.display = 'block';
            gameContainer.style.display = 'none';
        }
    });
}

// Загрузка данных пользователя
function loadUserData(user) {
    const userRef = database.ref(`users/${user.uid}`);
    
    userRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            checkDailyReset(user, data);
            points = data.points;
            currentUserNickname = data.nickname || 'Аноним';
            userNicknameDisplay.textContent = currentUserNickname;
            pointsDisplay.textContent = points;
        } else {
            // Новый пользователь (если вдруг данные не создались)
            resetDailyPoints(user);
        }
    });
}

// Проверка ежедневного сброса очков
function checkDailyReset(user, userData) {
    const today = new Date().toDateString();
    if (userData.lastReset !== today) {
        resetDailyPoints(user);
    }
}

// Сброс очков
function resetDailyPoints(user) {
    const today = new Date().toDateString();
    database.ref(`users/${user.uid}`).update({
        points: 100,
        lastReset: today
    });
}

// Обновление очков пользователя
function updateUserPoints(user, newPoints) {
    database.ref(`users/${user.uid}`).update({
        points: newPoints
    });
}

// Добавляем CSS для подсказки
const style = document.createElement('style');
style.textContent = `
    .pixel-tooltip {
        position: absolute;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 2px 5px;
        border-radius: 3px;
        font-size: 10px;
        z-index: 100;
        transform: translateY(-20px);
    }
    .pixel {
        position: relative;
    }
`;
document.head.appendChild(style);
