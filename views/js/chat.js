
/** JSON Sobre el usuario conecado al sistema */
var user = {};
var Tconvs = '';

$(document).foundation();
$(document).ready(function () {
  $('#login-modal').foundation('reveal', 'open');
});

/**
 * Autentica a un usuario en el servidor mediante
 * AJAX. Se ejecuta desde el formulario de login.
 *
 * Si hay un error al autenticar, lo mostrara al usuario,
 * de lo contrario recupera los datos del usuario e
 * inicializa los sockets.
 */
function login() {
  $.ajax({
    type: "POST",
    url: '/login',
    data: $('#login-form').serialize(),
    success: function (data) {
      $('#alerts').empty();
      if (data.error) {
        var html = '<div data-alert class="alert-box alert round">'
                   + data.err.msg + '</div>';
        $('#alerts').append(html);
      }
      else {
        user = data.user;
        Tconvs = user.tiposala;
        var socket = new io();
        configureSocket(socket);
        $('#btn-login').css('display', 'none');
        $('#login-modal').foundation('reveal', 'close');
      }
    },
    dataType: 'json'
  });
}


/**
 * Agrega un mensaje a la lista de mensajes
 * pertenecientes a la conversacióñ
 */
function appendMessage(msg) {
  var humanDate = moment(new Date(msg.date)).calendar();
  var html = '<div class="small-11 message">' +
                '<blockquote>' +
                  '<span class="message-title">' + msg.username +
                  ':</span>' +
                  '<cite class="right message-date show-for-medium-up">' + humanDate + '</cite>' +
                  '<div class="message-body">' +
                  msg.message +
                  '</div>' +
                '</blockquote>' +
              '</div>';
             
  var listmsgs = $('#list-msgs');
  listmsgs.append( html );
  
  var sh = listmsgs[0].scrollHeight;
  listmsgs.scrollTop(sh);
}

/**
 * Inicializa 'socket.io', configura
 * las acciones para cada evento soportado
 * por la aplicación.
 */



function mostrarConversaciones(socket, conversaciones) {
  var ajuste = 700;
  var fecha = new Date();
  for (var i = 0; i < conversaciones.length; i++) {

    var nmsg = {
          username : conversaciones[i].username,
          message : conversaciones[i].message,
          date : new Date(fecha.getTime() + ajuste*conversaciones[i].time).getTime()
        };

    var timer = setTimeout(function(socket, nmsg) {
      socket.emit('chat message', nmsg);
    } , ajuste*conversaciones[i].time, socket, nmsg);
    
  } 
}


function configureSocket(socket) {
  /**
   * Cuando el servidor envia la lista de usuarios conectados.
   * se reciben a través de este evento,
   * cada usuario se agrega a la lista de usuarios online
   * @param  {[type]} users Array con usuarios conectados en el momento
   */
  socket.on('all online users', function (users) {
    console.log(users.length + ' users received');
    for (var i=0; i<users.length; i++) 
    {
      var userhtml = '<div class="' + users[i]._id + 
                '" online-user">' + 
                '<img src="img/estrella.png" class="user-image">' +
                '<strong>&nbsp;&nbsp;' + users[i]._id + '</strong>'+
                '</div>';
      $('.online-userslist').append(userhtml);
    }
  });
  
  /**
   * Listener para el evento 'chat message'
   *   Notese que es el mismo evento que se envia 
   *   desde el servidor.
   * Agregamos el mensage entrante a la lista.
   */
  socket.on('chat message', function (msg) {
    appendMessage(msg);
  });
  
  /**
   * Cuando el servidor envia los ultimos mensajes registrados
   * se reciben a través de este evento.
   * Cada mensaje se agrega a la lista de mensajes en la vista
   * de la conversación.
   */
  socket.on('latest messages', function (messages) {
    for (var i = messages.length - 1; i >= 0; i--) {
      appendMessage(messages[i]);
    };
  })

    /**
   * la información de la conversacion
   */
  socket.on('entrada conv', function (conversaciones) {
    mostrarConversaciones(socket, conversaciones);
    })

  
  /**
   * Listener para evento 'new user', el servidor lo emite
   * cuando un usuario se ha conectado
   * @param  {[json]} nuser el usuario recien conectado
   */
  socket.on('new user', function (nuser) {
    var userhtml = '<div class="online-user ' + nuser._id +'">' + 
                '<img src="img/estrella.png" class="user-image">' +
                '<strong>&nbsp;&nbsp;' + nuser._id + '</strong>'+
                '</div>';
                
    $('.online-userslist').append(userhtml);
  });
  
  /**
   * Cada vez que un usuario se desconecta, debemos eliminarlo
   * de la lista de usuarios conectados, el servidor envia un mensaje
   * con este evento para informarnos sobre un usuario desconectado.
   * @param  {[json]} nuser El usuarios que se acaba de desconectar
   */
  socket.on('remove user', function (nuser) {
    $('.' + nuser._id).remove();
  });
  
  /**
   * Emitimos un evento de tipo 'chat message' cada vez
   * que se presiona 'Enter' en el textarea y enviamos
   * su contenido como mensaje al servidor.
   */
  $('#new-msg').keyup(function (evt) {
    if (evt.keyCode === 13 && $('#new-msg').val() != "") {
      var nmsg = {
        username : user._id,
        message : $('#new-msg').val(),
        date : Date.now()
      }
      socket.emit('chat message', nmsg);
      $('#new-msg').val('');
    }
  });
  
  /**
   * Solicitamos al servidor la lista de usuarios conectados
   * en este momento.
   */
  socket.emit('all online users');
  
  /**
   * Emitimos el evento 'new user' para que el servidor
   * informe a todos los usuarios que estamos en linea.
   */
  socket.emit('new user', user);
  
  /**
   * Solicitamos al servidor los ultimos mensajes
   * del historial registrado.
   */
  // socket.emit('latest messages');

    /**
   * se manda la conversacion última
   */
  socket.emit('entrada conv', Tconvs);
  
}