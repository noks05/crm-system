(() => {
  // работа с данными
  const methodsClient = {
    // сохраняем созданного клиента
    onSave: async function (data) {
      const response = await fetch('http://localhost:3000/api/clients',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      return getResponseServer(response);
    },
    // изменяем данные клиента
    onChange: async function (data, id) {
      const response = await fetch('http://localhost:3000/api/clients/' + id,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      return getResponseServer(response);
    },
    // получаем данные клиентов
    getDataClients: async function () {
      const {loader,table} = addLoaderToTable();
      const dataClients = await fetch('http://localhost:3000/api/clients');
      const clients = await dataClients.json();
      setTimeout(()=> {
        loader.remove();
        table.classList.remove('loading');
      }, 500);

      return clients;
    },
    // получаем данные одного клиента по строке
    getSearchClients: async function (searchStr) {
      const clientsData = await fetch('http://localhost:3000/api/clients?search=' + searchStr);
      const clients = await clientsData.json();
      return clients;
    },
    // получаем данные одного клиента по id
    getClient: async function (id) {
      const clientData = await fetch('http://localhost:3000/api/clients/' + id);
      const client = await clientData.json();
      return client;
    },
    // удаляем данные клиента
    onDelete: async function (id) {
      const response = await fetch('http://localhost:3000/api/clients/' + id,
        {
          method: 'DELETE',
        });
      return getResponseServer(response);
    },
  }

  // Ответ сервера может содержать один из статусов ответа
  function getResponseServer(response) {
    let resp = '';
    if (response.status === 404)
      resp = 'Ошибка: Переданный в запросе метод не существует или запрашиваемый элемент не найден в базе данных';
    else if (response.status === 422)
      resp = response.message;
    else if (response.status >= 500)
      resp = 'Ошибка: Странно, но сервер сломался :(<br>Обратитесь к куратору Skillbox, чтобы решить проблему';
    // проверка на непонятную ошибку
    if (resp == undefined || resp.search('/[A-Za-z]/') !== -1)
      return 'Ошибка: Что-то пошло не так...';
    else if (resp !== '')
      return resp;

    return 'ok';
  }

  window.methodsClient = methodsClient;
})()
