(() => {
  // работа с данными
  const methodsClient = {
    // сохраняем созданного клиента
    onSave: async function (data) {
      const response = await fetch('https://jsonplaceholder.typicode.com/users',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      return getResponseServer(response);
    },
    // изменяем данные клиента
    onChange: async function (data, id) {
      const response = await fetch('https://jsonplaceholder.typicode.com/users' + id,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      return getResponseServer(response);
    },
    // получаем данные клиентов
    getDataClients: async function () {
      const { loader, table } = addLoaderToTable();
      const dataClients = await fetch('https://mocki.io/v1/16cbcc15-de82-423d-b5f8-ab042d932d54');
      const clients = await dataClients.json();
      console.log(clients)
      setTimeout(() => {
        loader.remove();
        table.classList.remove('loading');
      }, 500);

      return clients;
    },
    // получаем данные одного клиента по строке
    getSearchClients: async function (searchStr) {
      const clientsData = await fetch('https://mocki.io/v1/16cbcc15-de82-423d-b5f8-ab042d932d54?search=' + searchStr);
      const clients = await clientsData.json();
      return clients;
    },
    // получаем данные одного клиента по id
    getClient: async function (id) {
      const clientsData = await fetch('https://mocki.io/v1/16cbcc15-de82-423d-b5f8-ab042d932d54');
      const clients = await clientsData.json();
      const findClient = clients.find(obj => obj.id === id)
      console.log(findClient)
      return findClient;
    },
    // удаляем данные клиента
    onDelete: async function (id) {
      const response = await fetch('https://mocki.io/v1/16cbcc15-de82-423d-b5f8-ab042d932d54' + id,
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
