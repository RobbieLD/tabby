const setup = () => {
    setupSettings();
    setupTimer();
    refreshIcons();
    getBackground();
    buildIconSelector();
}

const getBackground = () => {
    let key = localStorage.getItem('unsplash');

    if (!key) {
        key = prompt("Please enter your unsplash api key");
        localStorage.setItem('unsplash', key);
    }

    const url = localStorage.getItem('url');
    const hour = localStorage.getItem('hour');
    const description = localStorage.getItem('description');

    if (!url || !hour || new Date().getHours() != hour) {
        fetch('https://api.unsplash.com/photos/random?orientation=landscape&query=nature&client_id=' + key)
            .then(response => response.json())
            .then(data => {
                const credit = document.getElementsByClassName('image-credit')[0];
                credit.innerHTML = data.description || data.alt_description;
                document.body.style.backgroundImage = "url('" + data.urls.full +"')";
                localStorage.setItem('url', data.urls.full);
                localStorage.setItem('hour', new Date().getHours());
                localStorage.setItem('description', data.description || data.alt_description);
            }).catch(error => {
                console.error(error);
                // Fall back and attempt to just use the cached one
                const credit = document.getElementsByClassName('image-credit')[0];
                credit.innerHTML = description;
                document.body.style.backgroundImage = "url('" + url +"')";
            });
    } else {
        const credit = document.getElementsByClassName('image-credit')[0];
        credit.innerHTML = description;
        document.body.style.backgroundImage = "url('" + url +"')";
    }
}

const setupTimer = () => {
    tick();

    setInterval(() => {
        tick();
    }, 60000);
}

const tick = () => {
    const now = new Date();

    const time = document.getElementsByClassName('time')[0];
    const date = document.getElementsByClassName('date')[0];

    time.innerHTML = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    date.innerHTML = convertDay(now.getDay()) + ' ' + 
        now.getDate() + '<span class="ordinal">' +
        ordinal(now.getDate()) + '</span> of ' +
        convertMonth(now.getMonth()) + ' ' +
        now.getFullYear();
}

const setupSettings = () => {
    const settingsButton = document.getElementsByClassName('settings-icon')[0];
    settingsButton.addEventListener('click', () => toggleSettings(true));

    const settingsButtonSave = document.getElementsByClassName('settings-button__save')[0];
    settingsButtonSave.addEventListener('click', () => {
        addNewIcon();
        toggleSettings(false);
    })

    const settingsButtonCancel = document.getElementsByClassName('settings-button__cancel')[0];
    settingsButtonCancel.addEventListener('click', () => toggleSettings(false));
}

const buildIconSelector = () => {
    const icons = JSON.parse(localStorage.getItem('icons'));

    if (!icons) {
        return;
    }

    const options = document.getElementsByClassName('settings-icons-selector')[0];
    options.innerHTML = '';

    for (const icon of icons) {
        const option = document.createElement('option');
        option.value = icon.title;
        option.textContent = icon.title;
        options.appendChild(option);
    }

    const removeButton = document.getElementsByClassName('settings-button__remove')[0];
    removeButton.addEventListener('click', removeIcon);
}

const removeIcon = () => {
    const selector = document.getElementsByClassName('settings-icons-selector')[0];
    const icons = JSON.parse(localStorage.getItem('icons'));
    localStorage.setItem('icons', JSON.stringify(icons.filter(i => i.title !== selector.value)))
}

const addNewIcon = () => {
    const url = document.getElementsByClassName('settings-input__url')[0].value;
    const fileElement = document.getElementsByClassName('settings-input__icon')[0];
    const title = document.getElementsByClassName('settings-input__title')[0].value;
    const icons = JSON.parse(localStorage.getItem('icons')) || [];
    const file = fileElement.files[0];

    encodeImage(file, icon => {
        icons.push({ url, icon, title });
        localStorage.setItem('icons', JSON.stringify(icons));
        refreshIcons();
        buildIconSelector();
    });
}

const encodeImage = (file, callback) => {
  const reader = new FileReader();
  reader.onloadend = () => callback(reader.result);
  reader.readAsDataURL(file);
}

const refreshIcons = () => {
    const icons = JSON.parse(localStorage.getItem('icons'));

    if (!icons) {
        return;
    }

    const container = document.getElementsByClassName('content')[0];
    // Clean and start again
    container.innerHTML = '';

    for (const icon of icons) {
        
        const iconElement = document.createElement('img');
        iconElement.classList.add('icon');
        iconElement.src = icon.icon;

        const linkElement = document.createElement('a');
        linkElement.href = icon.url;
        linkElement.target = "_blank";
        linkElement.title = icon.title;

        linkElement.appendChild(iconElement);
        
        container.appendChild(linkElement);
    }
}

const toggleSettings = (show) => {
    const panel = document.getElementsByClassName('settings-modal')[0]

    if (show) {
        panel.style.display = 'grid';
    }
    else {
        panel.style.display = 'none';
    }
}

const convertDay = (day) => {
    switch (day) {
        case 0:
            return 'Sunday';
        case 1:
            return 'Monday';
        case 2:
            return 'Tuesday';
        case 3:
            return 'Wendesday';
        case 4:
            return 'Thursday';
        case 5:
            return 'Friday';
        case 6:
            return 'Saturday';
    }
}

const convertMonth = (month) => {
    switch (month) {
        case 0:
            return 'January';
        case 1:
            return 'February';
        case 2:
            return 'March';
        case 3:
            return 'April';
        case 4:
            return 'May';
        case 5:
            return 'June';
        case 6:
            return 'July';
        case 7:
            return 'August';
        case 8:
            return 'September';
        case 9:
            return 'October';
        case 10:
            return 'November';
        case 11:
            return 'December';
    }
}

const ordinal = (n) => {
    return n%10==1&&n%100!=11?'st':n%10==2&&n%100!=12?'nd':n%10==3&&n%100!=13?'rd':'th';
}

// Hook up the event handler
setup();
