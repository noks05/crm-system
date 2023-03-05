(() => {
  // проверка на отстутствие букв русского алфавита
  const EMPTY_RUS_TEXT = /[^а-яА-я\s\ё]/;
  // проверка email на корректность
  const MAIL_VALID = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;


  // создаём шапку со полем поиска
  function createHeadSearch({ getSearchClients }) {
    const head = document.createElement('header');
    const logo = document.createElement('div');
    const contrForm = document.createElement('div');
    const form = document.createElement('form');
    const input = document.createElement('input');

    head.classList.add('head', 'flex');
    logo.classList.add('head__logo');
    contrForm.classList.add('head__search', 'search');
    form.classList.add('search__form');
    input.classList.add('search__input');

    form.action = '';
    form.method = '';
    input.autocomplete = 'off';
    input.name = 'search';
    input.type = 'search';
    input.placeholder = 'Введите запрос';

    contrForm.addEventListener('keydown', (e) => {
      const keyTrue = e.code !== 'ArrowUp' && e.code !== 'ArrowDown' && e.code !== 'Enter';
      if (keyTrue) return;

      switch (e.code) {
        case 'ArrowUp':
          moveElemOnAutocomlete('up');
          break;
        case 'ArrowDown':
          moveElemOnAutocomlete('down');
          break;
        case 'Enter':
          moveElemOnAutocomlete('enter');
          break;
      }
    });
    contrForm.addEventListener('click', (e) => {
      // доходим до li списка автодополнения
      const item = e.target.closest('.autocomplete__item');
      // если клик был на элементе автодополнения то начать поиск
      if (item) {
        // так ф-я поймёт из какого элемента брать текст для поиска
        item.classList.add('active');
        moveElemOnAutocomlete('enter');
      }
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
    });
    // отображаем найденные результаты по искомой подстроке
    input.addEventListener('input', async () => {
      // убираем цвет border у поля
      input.classList.remove('search__input_not-found');
      input.classList.remove('search__input_found');
      const textInput = input.value.trim();
      // получаем ссылку на старый список для удаления
      const autocomplete = document.querySelector('.autocomplete');
      if (textInput === '') {
        // удаляем старый список
        if (autocomplete) autocomplete.remove();
        return;
      }
      // найти клиентов в  базе по искомой строке
      const loader = createLoader();
      input.parentNode.parentNode.append(loader);
      const clients = await getSearchClients(textInput);
      setTimeout(() => loader.remove());


      if (clients.length === 0) {
        // добавляем красный border у поля
        input.classList.add('search__input_not-found');
        if (autocomplete) autocomplete.remove();
        return;
      }
      // получаем совпадения
      const valueAutocomlete =
        await extractTextForAutoComplete(clients, textInput.toLowerCase());
      // создаём список автодополнения из совпадений строк
      let autoCompleteList = createListAutoComplete(valueAutocomlete);
      input.parentNode.append(autoCompleteList); 4
      // удаляем предидущий список автодополнений
      if (autocomplete) autocomplete.remove();
    });

    head.append(logo);
    head.append(contrForm);
    contrForm.append(form);
    form.append(input);

    return head;
  }
  // переключаем элемент в списке автодополнения
  function moveElemOnAutocomlete(dir) {
    const list = document.querySelector('.autocomplete__list');
    if (!list) return;
    const items = list.childNodes;
    const lastIndex = items.length - 1;
    const itemsArr = Array.from(items);
    const itemActive = itemsArr.find(it => it.classList.contains('active'));
    if (itemActive) itemActive.classList.remove('active');
    let elem;

    switch (dir) {
      case 'up':
        if (!itemActive || itemActive === items[0])
          elem = items[lastIndex];
        else
          elem = itemActive.previousSibling;
        break;
      case 'down':
        if (!itemActive || itemActive === items[lastIndex])
          elem = items[0];
        else
          elem = itemActive.nextSibling;
        break;
      case 'enter':
        if (!itemActive) return;
        // убираем список автододопления
        const autocomplete = list.parentNode;
        autocomplete.remove();
        // ищем то что выбрали
        const inputSearch = document.querySelector('.search__input');
        // подсвечиваем поле
        inputSearch.classList.remove('search__input_not-found');
        inputSearch.classList.add('search__input_found');
        const contact = itemActive.querySelector('.autocomplete__contact');
        const name = contact.previousSibling.textContent;
        // добавляем полное имя в любом случае
        inputSearch.value = name;
        // и + контакт если есть
        if (contact.textContent !== '') {
          inputSearch.value = contact.textContent;
        };
        scrollToClient(itemActive);
        break;
    }
    if (elem) elem.classList.add('active');
    return elem;
  }
  // получаем нужный текст из данных для автодополнения
  async function extractTextForAutoComplete(data, strSearch) {
    if (data.length === 0) return;
    // если только русские буквы тогда ищем лишь имена
    let justName = true;
    if (EMPTY_RUS_TEXT.test(strSearch)) {
      justName = false;
    }
    return data.reduce((accum, client, index) => {
      const fullname = client.surname + ' ' + client.name + ' ' + client.lastName;
      // записываем id
      if (!index) accum.push([]);
      accum[0] = [...accum[0], client.id];
      // пушим массив-контейнер для имён
      if (!index) accum.push([]);
      // записываем искомые имена
      if (justName) {
        const checkName = fullname.toLowerCase().includes(strSearch);
        // if (checkName) accum.push(fullname);
        if (checkName) {
          // имена которые ищем
          accum[1] = [...accum[1], fullname];
        }
        return accum;
      }
      // имена для контактов
      accum[1] = [...accum[1], fullname];
      // записсываем контакты
      let contacts = client.contacts
        .reduce((arr, it) => {
          const findStr = it.value.toLowerCase().includes(strSearch);
          if (findStr) {
            return arr = [...arr, it.value];
          } else {
            return arr;
          }
        }, []);
      if (!index) accum.push([]);
      accum[2] = [...accum[2], contacts];

      return accum;
    }, []);
  }
  // создаём спсиок автодополенния к поиску по таблице
  function createListAutoComplete(array) {
    const contr = document.createElement('div');
    const list = document.createElement('ul');
    contr.classList.add('contr-search__autocomplete', 'autocomplete');
    list.classList.add('autocomplete__list');

    let autocompleteItems;
    let justName = false;
    // шаг только один если мы ищем именно имена
    let maxStep = 1;
    // перевобр происходит по именам клиентов
    autocompleteItems = array[1];
    // проверка на то получили ли мы контакты или же имена
    if (array[2] === undefined) {
      justName = true;
    }

    autocompleteItems.forEach((el, index) => {
      // записываем количество найденных контактов для конкретного имени
      let contacts;
      if (!justName) {
        contacts = array[2][index];
        maxStep = contacts.length;
      }

      for (let i = 0; i < maxStep; ++i) {
        const item = document.createElement('li');
        const textContr = document.createElement('a');
        const name = document.createElement('span');
        const contact = document.createElement('span');

        item.classList.add('autocomplete__item');
        textContr.classList.add('autocomplete__text');
        name.classList.add('autocomplete__name');
        contact.classList.add('autocomplete__contact');

        textContr.addEventListener('click', (e) => {
          e.preventDefault();
        })
        textContr.href = '#' + array[0][index];
        name.textContent = el;
        if (!justName) contact.textContent = contacts[i];

        list.append(item);
        item.append(textContr);
        textContr.append(name);
        textContr.append(contact);
      }
    });
    contr.append(list);
    return contr;
  }
  // прокрутка до элемента
  function scrollToClient(item) {
    const link = item.childNodes[0];
    const id = link.href.split('#')[1];
    const client = document.getElementById('' + id);

    const clients = document.querySelectorAll('.table__row');
    // удаляем все предыдущие выделения
    clients.forEach(it => it.classList.remove('active'));
    client.classList.add('active');

    client.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  // создаём таблицу
  function createTableClients(nameColumns, methodsClient) {
    const table = document.createElement('table');
    const caption = document.createElement('caption');

    table.classList.add('table');
    caption.classList.add('table__caption');

    caption.textContent = 'Клиенты';

    table.append(caption);
    table.append(createTableHead(nameColumns, methodsClient));
    table.append(createTableBody());

    return table;
  }
  // создаём анимацию загрузки данных в таблицу
  function createLoader() {
    const loader = document.createElement('div');
    const loaderImg = document.createElement('div');
    loader.classList.add('loader');
    loaderImg.classList.add('loader__img');
    loader.append(loaderImg);
    return loader;
  }
  // добавляем иллюстрацию загрузки в таблицу
  function addLoaderToTable() {
    const table = document.querySelector('.table');
    const tableBody = table.querySelector('.table__body-contr');
    const loader = createLoader();
    tableBody.append(loader);
    // индикатор того что данные в таблицу загружаются
    table.classList.add('loading');
    return {
      table,
      loader,
    };
  }
  // создаём thead таблицы
  function createTableHead(nameColumns, methodsClient) {
    const tableHead = document.createElement('thead');
    tableHead.classList.add('table__head-contr');
    // создаём ряд колонок
    const row = createRowHeadTable(nameColumns, methodsClient)

    tableHead.append(row);
    return tableHead;
  }
  // создаём tbody таблицы
  function createTableBody() {
    const tableBody = document.createElement('tbody');
    tableBody.classList.add('table__body-contr');

    return tableBody;
  }
  // наполняем tbody таблицы
  function pushTableBody(nameColumns, dataBody) {
    const tableBody = document.querySelector('.table__body-contr');
    // перебираем массив с данными о клиентах
    dataBody.forEach((objClient) => {
      // создаём один ряд ячеек для tbody
      const row = createRowBodyTable(nameColumns, objClient);
      // добавляем ряд в тело таблицы
      tableBody.append(row);
    })

    return tableBody;
  }
  // создаём ряд ячеек для thead
  function createRowHeadTable(nameColumns, methodsClient) {
    // создаём ряд
    const row = document.createElement('tr');
    row.classList.add('table__row-head');
    // слушатель для сортировки данных таблицы
    row.addEventListener('click', async (e) => {
      // сортируем по клику данные таблицы
      await sortDataClients(row, e, methodsClient);
    });
    // наполняем ряд ячейками
    nameColumns.forEach((nameCol) => {
      const cellHead = document.createElement('th');
      const span = document.createElement('span');
      span.classList.add('table__head-text');
      cellHead.classList.add('table__cell-head');
      cellHead.setAttribute('data-id', nameCol);
      let spanText;
      let classCell;
      // наполняем ячейки контентом
      switch (nameCol) {
        case 'id':
          spanText = 'ID';
          classCell = 'table__cell-head_id active-up';
          break;
        case 'fullname':
          spanText = 'Фамилия Имя Отчество';
          classCell = 'table__cell-head_fullname';
          break;
        case 'created-at':
          spanText = 'Дата и время создания';
          classCell = 'table__cell-head_created-at';
          break;
        case 'updated-at':
          spanText = 'Последние изменения';
          classCell = 'table__cell-head_updated-at';
          break;
        case 'contacts':
          spanText = 'Контакты';
          classCell = 'table__cell-head_contacts';
          break;
        case 'actions':
          spanText = 'Действия';
          classCell = 'table__cell-head_actions';
          break;
        case 'link':
          spanText = 'Ссылки';
          classCell = 'table__cell-head_link';
          break;
      }

      span.textContent = spanText;
      cellHead.classList.add(...classCell.split(' '));


      cellHead.append(span);

      // добавляем ячейку в ряд
      row.append(cellHead);
    })
    return row;
  }
  // сортируем по клику данные таблицы
  async function sortDataClients(row, event, methodsClient) {
    const target = event.target;
    const curCell = target.closest('.table__cell-head');
    // по ячейке был клик?
    if (!curCell) return;
    // находится ли эта ячейка в данном ряду шапки таблицы
    if (!row.contains(curCell)) return;
    // только на первых четырех ячейках слушатель должен работать
    const dataId = curCell.dataset.id;
    const cellTrue = dataId === 'contacts' || dataId === 'actions' || dataId === 'link';
    if (cellTrue) return;
    // отображение статуса сортировки
    const stateUp = curCell.classList.contains('active-up');
    const stateDown = curCell.classList.contains('active-down');
    // удалям класы у всех кроме текущего элемента
    const cellsHead = document.querySelectorAll('.table__cell-head');
    cellsHead.forEach(cell => {
      if (curCell !== cell) {
        cell.classList.remove('active-up');
        cell.classList.remove('active-down');
      }
    })
    // добавляем класс в зависимости от текущего состояния
    curCell.classList.toggle('active-up', !stateUp && !stateDown);
    curCell.classList.toggle('active-down', !!stateUp);
    // меняем тип сортировки
    const clients = await relaySortTable(stateUp, stateDown, curCell, methodsClient);
    // заменяем спсиок клиентов на новый
    replaceTbody(clients);
  }
  // заменяем содержимое tbody таблицы
  function replaceTbody(clients) {
    // получаем имена колонок
    nameColumns = getNameColumns();
    // заменяем содержимое таблица на отсортированный спсиок
    const tbody = document.querySelector('.table__body-contr');
    tbody.innerHTML = '';
    pushTableBody(nameColumns, clients);
  }
  // смена типа сортировки по клику
  async function relaySortTable(stateUp, stateDown, curCell, methodsClient) {
    let clients;
    const dataId = curCell.getAttribute('data-id');
    if (!stateUp && !stateDown) {
      // создаём отсортированный массив клиентов
      clients = await sortTableData(dataId, methodsClient);
    } else if (stateUp) {
      // создаём отсортированный отзеркаленный массив клиентов
      clients = await sortTableData(dataId, methodsClient);
      clients.reverse();
    } else {
      clients = await methodsClient.getDataClients();
    }
    return clients;
  }
  // сортируем таблицу
  async function sortTableData(dataId, methodsClient) {
    // получаем данные о клиентах с сервера или локального хранилища
    const clients = await methodsClient.getDataClients();
    // создаём отсортированный массив значений определённой колонки
    const clientsEntriesSorted = createSortedEntries(dataId, clients);
    // фильтруем клиентов по совпадению нужных полей
    // с значениями из отсортиованного списка
    return createSortedClientsList(dataId, clients, clientsEntriesSorted);
  }
  // создаём отсортированный массив уникальных значений определённой колонки
  function createSortedEntries(dataId, clients) {

    const clientsEntriesSorted = clients.reduce((arrSorted, client) => {
      arrSorted.push(returnEntryByColumn(dataId, client));

      return arrSorted;
    }, []);
    // удаляем повторяющиеся значения
    return createUniqueList(clientsEntriesSorted.sort());
  }
  // возвращаем значение относительно колонки
  function returnEntryByColumn(dataId, client) {
    let response;
    switch (dataId) {
      case 'id':
        response = client.id;
        break;
      case 'fullname':
        response = client.surname + ' ' + client.name + ' ' + client.lastName;
        break;
      case 'created-at':
        response = client.createAt;
        break;
      case 'updated-at':
        response = client.updatedAt;
    }
    return response;
  }
  // убираем повторяющиеся свойства
  function createUniqueList(arrEntry) {
    return arrEntry.reduce((uniqueStr, str) => {
      // возвращаем массив без изменений если в нём уже есть эта строка
      if (uniqueStr.includes(str)) return uniqueStr;
      // в противном случае возвращаем новый массив с добавленной в него строкой
      return [...uniqueStr, str];
    }, []);
  }
  // фильтруем клиентов по совпадению нужных полей
  // с значениями из отсортиованного списка
  function createSortedClientsList(dataId, clients, clientsEntriesSorted) {
    return clientsEntriesSorted.reduce((arrSorted, entry) => {
      // сравниваем значение поля клиента со значением из сортированного массива
      let arrEntry = clients.filter(client => {
        const clientEntry = returnEntryByColumn(dataId, client);

        return entry === clientEntry;
      })
      return arrSorted = [...arrSorted, ...arrEntry];
    }, []);
  }
  // создаём ряд ячеек для tbody
  function createRowBodyTable(nameColumns, objClient) {
    // получаем значение ключей
    const { id, surname, name, lastName, createdAt, updatedAt, contacts } = objClient;
    // создаём ряд-элемент таблицы
    const row = document.createElement('tr');
    row.classList.add('table__row');
    row.id = id;
    // создаём один ряд ячеек
    nameColumns.forEach((nameCol) => {
      const cellBody = document.createElement('td');
      const span = document.createElement('span');
      cellBody.classList.add('table__cell-body');
      span.classList.add('table__cell-text');

      switch (nameCol) {
        case 'id':
          span.textContent = id;
          span.classList.add('grey-color');
          cellBody.append(span);
          break;
        case 'fullname':
          span.textContent = [surname, name, lastName].join(' ');
          cellBody.append(span);
          break;
        case 'created-at':
          cellBody.append(createDataAndTime(createdAt));
          break;
        case 'updated-at':
          cellBody.append(createDataAndTime(updatedAt));
          break;
        case 'contacts':
          cellBody.append(createListContacts(contacts));
          break;
        case 'actions':
          cellBody.append(createBtnAction(methodsClient, nameColumns));
          cellBody.append(createInputHidden(id, 'id-client'));
          break;
        case 'link':
          cellBody.append(createLinkClient(id));
          break;
      }
      // добавляем ячейку в ряд
      row.append(cellBody);
    })
    return row;
  }
  // создаём ссылку на карточку с конкретным клиентом
  function createLinkClient(id) {
    const input = document.createElement('input');
    input.classList.add('table__link-client', 'grey-color');
    const domain = location.href.split('#')[0];
    input.value = domain + '#' + id;
    input.type = 'text';
    input.disabled = true;
    return input;
  }
  // создаём дату создания для таблицы
  function createDataAndTime(fullDate) {
    const contr = document.createElement('div');
    const dateElement = document.createElement('span');
    const timeElement = document.createElement('span');

    contr.classList.add('table__contr-date');
    dateElement.classList.add('table__date');
    timeElement.classList.add('table__time');

    const date = fullDate
      .split('T')[0]
      .split('-')
      .reverse()
      .join('.');
    const time = fullDate
      .split('T')[1]
      .split('.')[0]
      .slice(0, 5);

    dateElement.textContent = date + '';
    timeElement.textContent = time + '';

    contr.append(dateElement);
    contr.append(timeElement);

    return contr;
  }
  // создаём список значков контактов
  function createListContacts(contacts) {
    const list = document.createElement('ul');
    list.classList.add('table__list-contact');

    contacts.forEach((dataContact) => {
      const listItem = document.createElement('li');
      const contact = document.createElement('a');
      listItem.classList.add('table__contact');
      contact.classList.add('table__contact-img');
      let classContact;
      let hrefText;

      switch (dataContact.type.toLowerCase()) {
        case 'vk':
          classContact = 'table__contact-img_vk';
          hrefText = dataContact.value;
          break;
        case 'facebook':
          classContact = 'table__contact-img_facebook';
          hrefText = dataContact.value;
          break;
        case 'email':
          classContact = 'table__contact-img_mail';
          hrefText = 'mailto:' + dataContact.value;
          break;
        case 'телефон':
          classContact = 'table__contact-img_phone';
          hrefText = 'tel:' + dataContact.value;
          break;
        default:
          classContact = 'table__contact-img_default';
          hrefText = !dataContact.value.includes('https://') ?
            'https://' + dataContact.value :
            dataContact.value;
          break;
      }
      contact.classList.add(...classContact.split(' '));
      contact.href = hrefText;
      // добавляем посказку
      const tooltip = createTooltipContacts(dataContact);

      listItem.append(tooltip);
      listItem.append(contact);
      list.append(listItem);
    })

    list.classList.add('table__list-contact');

    return list;
  }
  // создание элемента-подсказка
  function createElementTooltip() {
    const tooltip = document.createElement('div');
    const key = document.createElement('span');
    const value = document.createElement('span');
    tooltip.classList.add('tooltip');
    key.classList.add('tooltip-key');
    value.classList.add('tooltip-value');
    tooltip.append(key);
    tooltip.append(value);
    return {
      tooltip,
      key,
      value,
    }
  }
  // добавляем подсказку для списка контактов
  function createTooltipContacts(contact) {
    const { tooltip, key, value } = createElementTooltip();

    const contactValue = contact.value;

    switch (contact.type.toLowerCase()) {
      case 'email':
        value.textContent = contactValue;
        break;
      case 'телефон':
        value.textContent = convertPhone(contactValue);
        key.textContent = '';
        break;
      case 'twitter':
        key.textContent = contact.type + ': ';
        value.textContent = '@' + contactValue.split('/').slice(-1);
        value.style.color = '#B89EFF';
        break;

      default:
        value.textContent = contactValue
          .replace('http://', '')
          .replace('https://', '');
        break;
    }

    return tooltip;
  }
  // создаём кнопки таблицы 'Изменить' и 'Удалить'
  function createBtnAction(methodsClient, nameColumns) {
    const classBtn = ['table__btn_change', 'table__btn_delete'];
    const valueBtn = ['Изменить', 'Удалить'];
    const contr = document.createElement('div');

    valueBtn.forEach(async (text, index) => {
      const btn = document.createElement('button');
      btn.classList.add('table__btn', classBtn[index], 'btn-reset');
      btn.textContent = text;
      // слушатель для обработки данных на разные кнопки
      if (!index) {
        btn.addEventListener('click', async () => {
          // добавляем иконку загрузки
          btn.classList.add('active');
          // получаем id из скрытого input
          const id = btn.parentNode.nextSibling.value;
          const client = await methodsClient.getClient(id);
          // таймер временно - для нагляности
          // удаляем колесо загрузки у кнопки
          // btn.classList.remove('active')
          setTimeout(() => btn.classList.remove('active'), 500);
          // таймер временно - для нагляности
          // создаём модальное окно с формой
          // createModalWithForm(client, methodsClient, nameColumns);
          setTimeout(() => createModalWithForm(client, methodsClient), 500)
        })
      } else {
        btn.addEventListener('click', async () => {
          btn.classList.add('active');
          const id = btn.parentNode.nextSibling.value;
          await createModalDelete(id, methodsClient);
        });
      }
      contr.append(btn);
    })
    return contr;
  }
  // инпут хранящий id конкретного клиента
  function createInputHidden(value, name) {
    const input = document.createElement('input');
    input.classList.add('form-delete__input-hidden');
    input.name = name;
    input.type = 'hidden';
    input.value = value;
    return input;
  }
  // создаём кнопку таблицы добавления нового клиента
  function createBtnAddClient() {
    const btn = document.createElement('button');
    const span = document.createElement('span');

    btn.classList.add('btn-add-contact', 'btn-reset');
    span.classList.add('btn-add-contact__text');

    span.textContent = 'Добавить клиента';
    btn.addEventListener('click', () => createModalWithForm(undefined, methodsClient));
    btn.append(span);

    return btn;
  }









  // создаём модальное окно
  function createModalWithForm(client, methodsClient) {
    if (client && client.message === 'Client Not Found') return createMessageAboutDelete();
    const wrapper = document.querySelector('.wrapper');
    // создаём оболочку модального окна и контейнер формы
    const { modalWindow, modalCard } = createModalContr(true);
    const form = createModalForm(methodsClient, modalWindow, client);

    // создаём заголовок
    const contrTitle = createModalTitle(client);
    form.append(contrTitle);

    // создаём поля для ввода ФИО
    const listFullname = createFullNameInputs(client);
    form.append(listFullname);

    // создаём список полей добавления контактов
    const wrapContacts = createContactInputs(client);
    form.append(wrapContacts);

    // создаём элемент с текстом ошибки
    const error = createContrError();
    form.append(error);

    // добавляем кнопку "Cохранить" и "Удалить" или "Отменить"
    const { btnTop, btnDown } = client ?
      createBtnModalCard('form-client__save', 'form-client__delete', 'Сохранить', 'Удалить клиента') :
      createBtnModalCard('form-client__save', 'form-client__delete', 'Сохранить', 'Отменить');
    if (client) {
      // для кнопки Удалить
      btnDown.addEventListener('click', async () => {
        modalWindow.remove();
        createModalDelete(client.id, methodsClient);
      });
    } else {
      // для кнопки Отменить
      btnDown.addEventListener('click', async () => {
        modalWindow.remove();
      });
    }
    form.append(btnTop);
    form.append(btnDown);

    modalCard.append(form);
    modalWindow.append(modalCard);
    wrapper.append(modalWindow);
    // анимация появления модального окна
    setTimeout(() => modalWindow.classList.add('modal-client_visibly'), 100);
  }
  // создаём оболочку модального окна и контейнер формы
  function createModalContr(createCard) {
    const modalWindow = document.createElement('div');
    const modalCard = document.createElement('div');
    const close = document.createElement('span');

    modalWindow.classList.add('modal-client');
    modalCard.classList.add('modal-card');
    close.classList.add('modal-client__close', 'form-close');
    // добавляем доп. класс для настройки окна удаления
    if (createCard !== true) {
      modalCard.classList.add('modal-client__card_delete');
    }
    // по клику на фон или крестик закрываем модальное окно
    modalWindow.addEventListener('click', (e) => {
      if (e.target === modalWindow) modalWindow.remove();
    });
    close.addEventListener('click', () => modalWindow.remove());

    modalWindow.append(modalCard);
    modalCard.append(close);
    return {
      modalCard,
      modalWindow,
    }
  }
  // создаём элемент форму добавления и изменения клиента
  function createModalForm({ onSave, onChange, getDataClients }, modalElement, client) {
    // имена ячеек - временная мера
    const form = document.createElement('form');
    form.classList.add('form-client', 'modal-client__form');
    form.name = 'add-form';
    form.action = '';
    form.method = '';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      // валидация
      if (validateForm()) return;
      // добавляем колесико загрузки
      const loader = createLoader();
      form.closest('.modal-card').append(loader);
      // выполняем запрос на сервер
      let response;
      if (!client) {
        // форма добавления клиента
        const data = collectDataFormClient(form, '.list-fullname__input');
        response = await onSave(data);
      } else {
        // форма изменения клиента
        const data = collectDataFormClient(form, '.list-fullname__input.change');
        response = await onChange(data, client.id);
      }
      if (response !== 'ok') {
        form.querySelector('.form__error').classList.add('active');
        form.querySelector('.form__error').textContent = response;
        return;
      }
      // таймер временно - дял наглядности
      // loader.remove();
      // modalElement.remove();
      setTimeout(() => loader.remove(), 500);
      setTimeout(() => modalElement.remove(), 500);

      // перерисовываем заного тбалицу
      replaceTbody(await getDataClients());
    })

    return form;
  }
  // собираем обект с данными о из формы добавления или изменения клиента
  function collectDataFormClient(form, classInput) {
    const inputsFullName = form.querySelectorAll(classInput);
    const inputsContact = form.querySelectorAll('.contacts__input');
    let client = {}
    const contacts = [];
    // собираем данные с полей ФИО
    client = collectDataFullname(inputsFullName, client);
    // собираем данные о контактах клиента
    client.contacts = collectDataContact(inputsContact, contacts);

    return client;
  }
  // собираем данные с полей ФИО
  function collectDataFullname(inputsFullName, client) {
    inputsFullName.forEach(input => {
      client[input.name] =
        input.value.split(' ')
          .map(str => str.trim())
          .filter(text => text.length > 0)
          .map(str => str[0].toUpperCase() + str.slice(1))
          .join('');
    })
    return client;
  }
  // собираем данные о контактах клиента
  function collectDataContact(inputsContact, contacts) {
    inputsContact.forEach(input => {
      const contact = {};
      contact.type = input.name;
      const inputName = input.name.toLowerCase();

      switch (inputName) {
        case 'email':
          contact.value = input.value;
          break;
        case 'телефон':
          contact.value = '+' + input.value.match(/\d/g).join('');
          break;
        default:
          let address = input.value
            .replace('http://', '')
            .replace('https://', '');

          if (address.includes('skype')) {
            contact.type = 'skype';

          } else if (address.includes('telegram')) {
            contact.type = 'telegram';

          } else if (address.includes('twitter')) {
            contact.type = 'twitter';

          } else if (address.includes('vk')) {
            contact.type = 'vk';

          } else if (address.includes('facebook')) {
            contact.type = 'facebook';

          } else {
            contact.type = 'другое';
          }
          contact.value = address;

          break;
      }
      contacts.push(contact);
    });
    return contacts;
  }
  // создаём заголовок
  function createModalTitle(client) {
    const contrTitle = document.createElement('div');
    const title = document.createElement('h5');

    contrTitle.classList.add('form-client__contr-title', 'form-container');
    title.classList.add('form-client__title', 'modal-title');

    title.textContent = 'Новый клиент';
    contrTitle.append(title);
    // если мы изменяем данные клиента, а не создаём
    if (client) {
      title.textContent = 'Изменить данные';
      const idClient = document.createElement('span');
      idClient.classList.add('form-client__id-text');
      idClient.textContent = 'ID:' + client.id;
      contrTitle.append(idClient);
    }

    return contrTitle;
  }
  // создаём поля для ввода ФИО
  function createFullNameInputs(client) {
    const listFullname = document.createElement('ul');
    listFullname.classList.add('list-fullname', 'form-container');
    const labelsInput = ['Фамилия', 'Имя', 'Отчество'];
    const namesInput = ['surname', 'name', 'lastName'];

    labelsInput.forEach((labelInput, i) => {
      const itemList = document.createElement('li');
      const label = document.createElement('label');
      const placeholder = document.createElement('span');
      const input = document.createElement('input');

      itemList.classList.add('list-fullname__contr-input');
      label.classList.add('list-fullname__label');
      placeholder.classList.add('list-fullname__placeholder');
      input.classList.add('list-fullname__input');

      input.type = 'text';
      input.name = namesInput[i];
      placeholder.textContent = labelInput;
      // уменьшаем placeholder если в поле есть текст
      input.addEventListener('input', () => {
        // если начался ввод делаем кнопку активной
        const btnSave = input
          .closest('.form-client')
          .querySelector('.form-client__save');
        btnSave.classList.remove('disablid');
        input.classList.remove('invalid');
        input.value !== '' ?
          input.classList.add('active') :
          input.classList.remove('active');
      })
      // заполняем поля если изменяем клиента
      if (client) {
        input.classList.add('active');
        const namePart = client[namesInput[i]];
        input.value = namePart[0] && namePart || '';
        input.addEventListener('input', () => {
          input.classList.add('change');
        });
      };

      label.append(input);
      label.append(placeholder);
      itemList.append(label);
      listFullname.append(itemList);
    });
    return listFullname;
  }
  // создаём список полей добавления контактов
  function createContactInputs(client) {
    const wrapContacts = document.createElement('div');
    const listContacts = document.createElement('ul');
    wrapContacts.classList.add('contacts');
    listContacts.classList.add('contacts__list', 'form-container');
    // получаем массив с контактами
    const contacts = client && client.contacts;
    // проверяем есть ли хоть один контакт в базе
    if (contacts != undefined && contacts.length !== 0) {

      contacts.forEach(contact => {
        // создаём все html элементы для одного контакта
        const itemsContact = createContactElements(contact);
        let input = itemsContact.input;
        const itemList = itemsContact.itemList;
        // добавляем класс для отображения кнопки удаляющей контакт
        input.classList.add('active');
        // добавляем индикатор изменнения поля
        input.addEventListener('input', () => {
          // если начался ввод делаем кнопку активной
          const btnSave = input
            .closest('.form-client')
            .querySelector('.form-client__save');
          btnSave.classList.remove('disablid');
          input.classList.remove('invalid');
          input.classList.add('change');
        });

        input.name = contact.type;
        input.value = contact.value;
        input = addTypeInputContact(contact, input);
        listContacts.append(itemList);
      });
      // добавляем паддинги для непустого контейнера
      wrapContacts.classList.add('active');
      if (contacts.length > 4) {
        wrapContacts.classList.add('contacts_padding');
      }
    }
    wrapContacts.append(listContacts);
    // создаём кнопку "добавить контакт"
    const btnAddContact = client ?
      createBtnAddContact(true) :
      createBtnAddContact();

    wrapContacts.append(btnAddContact);

    return wrapContacts;
  }
  // создаём все html элементы для одного контакта
  function createContactElements(contact, change) {
    const itemList = document.createElement('li');
    const contrContact = document.createElement('div');
    let input = document.createElement('input');
    const clearInput = document.createElement('div');
    const { select, titleSelect } = createSelect(contact);

    itemList.classList.add('contacts__item');
    contrContact.classList.add('contacts__contr-contact');
    input.classList.add('contacts__input');
    clearInput.classList.add('contacts__clear');

    input.name = titleSelect.textContent;
    input = addTypeInputContact(titleSelect.textContent, input);
    input.placeholder = 'Введите данные';
    // если форма не пустая, добавляем кнопку удалить контакт
    input.addEventListener('input', () => {
      // если начался ввод делаем кнопку активной
      const btnSave = input
        .closest('.form-client')
        .querySelector('.form-client__save');
      btnSave.classList.remove('disablid');

      const state = input.value;
      input.classList.toggle('active', state);
      input.classList.remove('invalid');
    });
    // добавляем индикатор изменнения поля
    if (change) {
      input.addEventListener('input', () => input.classList.add('change'));
    }
    // кнопка 'удалить поле'
    clearInput.addEventListener('click', () => {
      const contactsList = clearInput.closest('.contacts__list');
      const contrContats = contactsList.closest('.contacts');
      const childs = contactsList.childNodes.length;

      if (childs <= 5) {
        contrContats.classList.remove('contacts_padding');
      }
      if (childs === 1) {
        clearInput.closest('.contacts').classList.remove('active');
      }
      clearInput.closest('.contacts__item').remove();
      // показать кнопку "добавить контакт" если контактов станет меньше десяти
      if (childs >= 10) {
        contactsList.nextSibling.classList.remove('active');
      }
    });
    // добавляем подсказку на кнопку удаления контакта
    const { tooltip } = createElementTooltip();
    tooltip.textContent = 'Удалить контакт';

    clearInput.append(tooltip);
    contrContact.append(select);
    contrContact.append(input);
    contrContact.append(clearInput);
    itemList.append(contrContact);

    return {
      itemList,
      input,
    };
  }
  // добавляем тип input
  function addTypeInputContact(item, input) {
    let itemCompare;
    const contactTrue = item.type !== undefined;

    if (contactTrue) {
      itemCompare = item.type
      itemValue = item.value
    } else {
      itemCompare = item;
    }

    switch (itemCompare.toLowerCase()) {
      case 'email':
        input.type = 'email';
        break;
      case 'телефон':
        input.type = 'tel';
        if (contactTrue) {
          input.value = convertPhone(item.value);
        }
        break;
      default:
        input.type = 'text';
        break;
    }
    return input;
  }
  // преобразуем телефон в нужную форму
  function convertPhone(numberPhone) {
    return phone =
      '+' + numberPhone.slice(1, 2) +
      ' (' + numberPhone.slice(2, 5) +
      ') ' + numberPhone.slice(5, 8) +
      '-' + numberPhone.slice(8, 10) +
      '-' + numberPhone.slice(10);
  }
  // создаём кастомный select
  function createSelect(contact) {
    const select = document.createElement('div');
    const titleSelect = document.createElement('div');
    const content = document.createElement('div');
    const namesOption = ['Телефон', 'Email', 'Vk', 'Facebook', 'Другое'];

    select.classList.add('select', 'contacts__select');
    titleSelect.classList.add('select__title');
    content.classList.add('select__content');

    titleSelect.textContent = namesOption[0];

    let find;
    namesOption.forEach((optionText, index) => {
      // выставляем заголовок select и убираем его из списка
      let removeElement;
      if (contact) {
        removeElement = setTitleSelect({ find, optionText, index, contact, titleSelect, namesOption });
        if (removeElement) find = true;
      } else if (index === 0) {
        removeElement = true;
      }
      const option = createElementOption({ optionText, titleSelect });
      if (removeElement) option.classList.add('disabled');
      content.append(option);
    });

    // при клике открываем список select
    titleSelect.addEventListener('click', () => {
      const selectActive = select.classList.contains('active');
      select.classList.toggle('block', !selectActive);
      setTimeout(() => select.classList.toggle('active', !selectActive), 10);
    })

    select.append(titleSelect);
    select.append(content);
    return {
      select,
      titleSelect
    };
  }
  // выставляем заголовок select и убираем его из списка
  function setTitleSelect({ find, optionText, index, contact, titleSelect, namesOption }) {
    if (find) return;

    const contactTrue = contact.type.toLowerCase() === optionText.toLowerCase();

    if (contactTrue) {
      titleSelect.textContent = optionText;
      // если нашли то больше не проводим проверки
      find = true;
    } else if (index === (namesOption.length - 1)) {
      // последний ли элемент
      titleSelect.textContent = 'Другое';
      find = true;
    }
    return find;
  }
  // создаём элемент option
  function createElementOption({ optionText, titleSelect }) {
    const option = document.createElement('label');
    const input = document.createElement('input');
    const text = document.createElement('span');

    option.classList.add('select__option');
    input.classList.add('select__input');
    text.classList.add('select__text');

    const runChangeSelectState = changeSelectState(option);
    // при изменении значения селекта изменяем имя соответств. поля
    option.addEventListener('click', () => {
      const parentOption = option.closest('.select__content');
      const options = parentOption.querySelectorAll('.select__option');
      // отобразим ранее скрытый элемент списка
      options.forEach(option => option.classList.remove('disabled'));
      option.classList.add('disabled');

      runChangeSelectState();
      // если начался изменили значение select
      const btnSave = titleSelect
        .closest('.form-client')
        .querySelector('.form-client__save');
      // активация кнопки 'Сохранить '
      btnSave.classList.remove('disablid');
    })
    input.type = 'radio';
    input.name = 'selectContacts';
    text.textContent = optionText;
    option.append(input);
    option.append(text);
    return option
  }
  // меняем состояние select и поля при выборе другого значения
  function changeSelectState(currentTarget) {
    let timerId;

    return function () {
      const option = currentTarget;
      if (timerId) return timerId = undefined;
      // предотвращаем запуск 2 событий за раз
      timerId = setTimeout(changeSelectState, 1);

      const select = option.closest('.select')
      const selectActive = select.classList.contains('active');
      select.classList.toggle('block', !selectActive);
      select.classList.toggle('active', !selectActive);

      const selectTitle = select.childNodes[0];
      // присваиваем текст кастомного option в заголовок select
      const textOption = option.childNodes[1].textContent
      selectTitle.textContent = textOption;
      // добавляем полю дял ввода данных соответствующее имя
      let input = select.nextSibling;
      input.name = textOption;
      input = addTypeInputContact(textOption, input);
    }
  }
  // создаём кнопку "добавить контакт"
  function createBtnAddContact(addClass) {
    const btnAddContact = document.createElement('button');
    btnAddContact.classList.add('contacts__add-contact', 'btn-reset');
    if (addClass) {
      btnAddContact.classList.add('contacts__add-contact_change');
    }
    btnAddContact.type = 'button';
    btnAddContact.textContent = 'Добавить контакт';

    btnAddContact.addEventListener('click', () => {
      const contactsList = document.querySelector('.contacts__list');
      const contrContats = contactsList.closest('.contacts');
      const childs = contactsList.childNodes.length;
      // добавляем паддинг если контактов от 5 и больше
      if (childs >= 4) {
        contrContats.classList.add('contacts_padding');
      }
      // добавляем стили контейнерам
      if (childs === 0) {
        const wrapContacts = document.querySelector('.contacts');
        wrapContacts.classList.add('active');
      }
      // больше 10 контактов добавить нельзя
      const contactElements = btnAddContact.closest('.contacts__add-contact_change') ?
        createContactElements(undefined, true) :
        createContactElements();
      contactsList.append(contactElements.itemList);
      if (childs >= 9) contactsList.nextSibling.classList.add('active');
    });

    return btnAddContact;
  };
  // контейнер для вывода текста ошибок
  function createContrError() {
    const contrError = document.createElement('div');
    contrError.classList.add('error', 'form__error');
    return contrError;
  }
  // общая фун-ия для создания однотипных кнопок модального окна
  function createBtnModalCard(classBtnTop, classBtnDown, valueBtnTop, valueBtnDown) {
    let btnTop = document.createElement('button');
    const btnDown = document.createElement('button');

    btnTop.classList.add(classBtnTop, 'btn-reset', 'btn-on');
    btnDown.classList.add(classBtnDown, 'btn-reset', 'btn-off');
    // отключаем кнопку пока опльзовательничего не ввел
    if (valueBtnTop !== 'Удалить') {
      btnTop.classList.add('disablid');
    }
    btnTop.type = valueBtnTop === 'Сохранить' ? 'submit' : 'button';
    btnDown.type = 'button';
    btnTop.textContent = valueBtnTop;
    btnDown.textContent = valueBtnDown;

    return {
      btnTop,
      btnDown,
    }
  }
  // валидация формы модального окна
  function validateForm() {
    let noValidate = false;
    const error = document.querySelector('.form__error');
    const fullnameInputs = document.querySelectorAll('.list-fullname__input');
    const contacts = document.querySelectorAll('.contacts__input');

    const dataMessage = {};
    dataMessage.input = '';
    dataMessage.text = '';
    // проверка на пустые поля ФИО
    fullnameInputs.forEach((input, index) => {
      if ((index < 2) && (input.value.trim() === '')) {
        dataMessage.input = input;
        dataMessage.text = 'Поля "Фамилия" и "Имя" не должны быть пустыми';
        return noValidate = showErrorMessage(error, dataMessage);
      }
    })
    if (noValidate) return noValidate;
    // проверка на некорректные символы в полях ФИО
    fullnameInputs.forEach((input) => {
      // ищем лишние символы
      const find = input.value.match(EMPTY_RUS_TEXT);
      // нашли лишние символы?
      if (find) {
        dataMessage.input = input;
        dataMessage.text = 'Пожалуйста введите ФИО используя только буквы русского алфавита';
        return noValidate = showErrorMessage(error, dataMessage);
      }
    })
    if (noValidate) return noValidate;
    // добавлен ли хоть один контакт?
    if (contacts == null) return noValidate;
    // проверка на пустые поля контактов
    contacts.forEach((contact) => {

      if (contact.value.trim() === '') {
        dataMessage.input = contact;
        dataMessage.text = 'Пожалуйста не оставляйте поле с созданным контактом пустым';
        return noValidate = showErrorMessage(error, dataMessage);
      }

      switch (contact.name.toLowerCase()) {
        case 'телефон':
          // ищем цифру
          const numbs = contact.value.match(/\d/g);
          // нашли цифру?
          if (!numbs || numbs.length !== 11) {
            dataMessage.input = contact;
            dataMessage.text = 'Номер телефона должен сожержать 11 цифр';
            return noValidate = showErrorMessage(error, dataMessage);
          }
          break;
        case 'email':
          // ищем лишние символы
          const find = contact.value.match(MAIL_VALID);
          // нашли лишние символы?
          if (!find) {
            dataMessage.input = contact;
            dataMessage.text = 'Email должен быть в формате volody_55@gmail.com';
            return noValidate = showErrorMessage(error, dataMessage);
          };
          break;
        case 'vk':
          // ищем лишние символы
          const substrVk = contact.value.includes('vk.com');
          // нашли лишние символы?
          if (!substrVk) {
            dataMessage.input = contact;
            dataMessage.text = 'Адрес страницы во вконтакте должен содержать строку - "vk.com"';
            return noValidate = showErrorMessage(error, dataMessage);
          };
          break;
        case 'facebook':
          // ищем лишние символы
          const substrFb = contact.value.includes('facebook.com');
          // нашли лишние символы?
          if (!substrFb) {
            dataMessage.input = contact;
            dataMessage.text = 'Адрес страницы на facebook должен содержать строку - "facebook.com"';
            return noValidate = showErrorMessage(error, dataMessage);
          };
          break;
      }
    })
    return noValidate;
  }
  //  показываем сообщение об ошибке
  function showErrorMessage(errorEl, { input, text }) {
    input.classList.add('invalid');
    errorEl.classList.add('active');
    errorEl.textContent = text;
    return true;
  }

  // модальное окно подтверждения удаления студента
  async function createModalDelete(id, { onDelete, getDataClients }) {
    // имена ячеек
    const wrapper = document.querySelector('.wrapper');
    const modalContrs = createModalContr(false);
    const modalWindow = modalContrs.modalWindow;

    const card = modalContrs.modalCard;
    const title = document.createElement('h5');
    const text = document.createElement('p');
    const btns = createBtnModalCard('form-delete__delete', 'form-delete__cancel', 'Удалить', 'Отмена');

    btns.btnTop.addEventListener('click', async (e) => {
      // добавляем иллюстрацию загрузку пока не получим данные с сервера
      const loader = createLoader();
      e.currentTarget.closest('.modal-card').append(loader);
      const id = e.currentTarget.nextSibling.value;
      await onDelete(id);
      // временно таймер
      setTimeout(() => loader.remove(), 500);
      // loader.remove();
      // перерисовываем заного таблицу
      replaceTbody(await getDataClients());
      // modalWindow.remove();
      setTimeout(() => modalWindow.remove(), 500);

    })
    btns.btnDown.addEventListener('click', () => {
      modalWindow.remove();
    })

    title.classList.add('form-delete__title', 'modal-title');
    text.classList.add('form-delete__text');
    title.textContent = 'Удалить клиента';
    text.textContent = 'Вы действительно хотите удалить данного клиента?';

    card.append(title);
    card.append(text);
    card.append(btns.btnTop);
    card.append(createInputHidden(id, 'id-client-delete'));
    card.append(btns.btnDown);

    wrapper.append(modalWindow);
    // анимация появления модального окна
    setTimeout(() => modalWindow.style.opacity = '100%', 10);
  }

  // сообщение о том что клиент уже удален при попытке загрузить его данные по ссылке
  function createMessageAboutDelete() {
    const wrapper = document.querySelector('.wrapper');
    const title = document.createElement('h5');
    const text = document.createElement('p');
    const btnOn = document.createElement('button');
    const btnOff = document.createElement('button');
    const { modalCard, modalWindow } = createModalContr(false);

    modalCard.classList.add('modal-message');
    title.classList.add('modal-message__title', 'modal-title');
    text.classList.add('modal-message__text');
    btnOn.classList.add('modal-message__btn-on', 'btn-reset', 'btn-on');
    btnOff.classList.add('modal-message__btn-off', 'btn-reset', 'btn-off');

    const hash = location.href.split('#')[1];

    title.textContent = 'Клиента не существует :('
    text.innerHTML = `По данному <span class="modal-message__id">ID:${hash}</span> не существует клиента в базе данных. Пожалуста очистите hash ссылки, чтобы устранить ошибку при обновлении страницы.`
    btnOn.textContent = 'Исправить ссылку'
    btnOff.textContent = 'Закрыть'

    btnOn.addEventListener('click', () => {
      const domain = location.href.split('#')[0];
      location.href = domain;
    })
    btnOff.addEventListener('click', () => {
      modalWindow.remove();
    })

    modalCard.append(title);
    modalCard.append(text);
    modalCard.append(btnOn);
    modalCard.append(btnOff);
    wrapper.append(modalWindow);
    // анимация появления модального окна
    setTimeout(() => modalWindow.classList.add('modal-client_visibly'), 10);

    return modalWindow;
  }

  // получаем имена колонок
  function getNameColumns() {
    const cellsHead = document.querySelectorAll('.table__cell-head');
    let nameColumns = [];
    cellsHead.forEach(cell => {
      nameColumns.push(cell.dataset.id);
    });
    return nameColumns;
  }

  // убираем по клику все раскрывающиеся списки
  function removeAllLists(e) {
    const search = e.target.closest('.search');
    const autocomplete = document.querySelector('.autocomplete');
    if (!search && autocomplete) autocomplete.remove();

    const autoCom = e.target.closest('.autocomplete');
    if (!autoCom) {
      const rowActive = document.querySelector('.table__row.active');
      if (rowActive) rowActive.classList.remove('active');
    }

    const selectActive = e.target.closest('.select');
    if (!selectActive) {
      const selectActive = document.querySelectorAll('.select.active');
      if (selectActive) {
        selectActive.forEach((it) => {
          it.classList.remove('active');
        })
      }
    }
  }












  // создание CRM системы
  async function createCrmSystem(nameColumns, methodsClient) {
    const wrapper = document.querySelector('.wrapper');
    const container = document.querySelector('.container');
    // убираем по клику все раскрывающиеся списки
    wrapper.addEventListener('click', event => removeAllLists(event));

    const headPage = createHeadSearch(methodsClient);
    const table = createTableClients(nameColumns, methodsClient);

    const btnAddClient = createBtnAddClient();

    wrapper.prepend(headPage);
    container.append(table);
    container.append(btnAddClient);
    // наполняем клиентами уже загруженную таблицу
    const data = await methodsClient.getDataClients();
    pushTableBody(nameColumns, data);

    return table;
  }


  window.createCrmSystem = createCrmSystem;
  window.createModalWithForm = createModalWithForm;
  window.addLoaderToTable = addLoaderToTable;
})()
