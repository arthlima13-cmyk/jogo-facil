import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [isEditingGame, setIsEditingGame] = useState(false)

  const [form, setForm] = useState({
    title: '',
    location: '',
    date: '',
    time: '',
    price: '',
    maxPlayers: '',
    pixKey: '',
  })

  const [editForm, setEditForm] = useState({
    title: '',
    location: '',
    date: '',
    time: '',
    price: '',
    maxPlayers: '',
    pixKey: '',
  })

  useEffect(() => {
    const pathParts = window.location.pathname.split('/')
    const gameId = pathParts[1] === 'jogo' ? pathParts[2] : null

    if (gameId) {
      loadGame(gameId)
    }
  }, [])

  const summary = useMemo(() => {
    if (!game) return null

    const confirmed = game.players.filter((p) => p.confirmed).length
    const paid = game.players.filter((p) => p.paid).length
    const pending = game.players.filter((p) => p.confirmed && !p.paid).length
    const total = paid * Number(game.price || 0)
    const freeSpots = Number(game.maxPlayers || 0) - game.players.length

    return { confirmed, paid, pending, total, freeSpots }
  }, [game])

  async function loadGame(gameId) {
    setLoading(true)

    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (gameError) {
      alert('Erro ao carregar jogo: ' + gameError.message)
      setLoading(false)
      return
    }

    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true })

    if (playersError) {
      alert('Erro ao carregar jogadores: ' + playersError.message)
      setLoading(false)
      return
    }

    setGame({
      id: gameData.id,
      title: gameData.title,
      location: gameData.location,
      date: gameData.date,
      time: gameData.time,
      price: gameData.price,
      maxPlayers: gameData.max_players,
      pixKey: gameData.pix_key || '',
      players: playersData || [],
    })

    setLoading(false)
  }

  async function createGame(event) {
    event.preventDefault()

    const { data, error } = await supabase
      .from('games')
      .insert({
        title: form.title,
        location: form.location,
        date: form.date,
        time: form.time,
        price: Number(form.price),
        max_players: Number(form.maxPlayers),
        pix_key: form.pixKey,
      })
      .select()
      .single()

    if (error) {
      alert('Erro ao criar jogo: ' + error.message)
      return
    }

    const newGame = {
      id: data.id,
      title: data.title,
      location: data.location,
      date: data.date,
      time: data.time,
      price: data.price,
      maxPlayers: data.max_players,
      pixKey: data.pix_key || '',
      players: [],
    }

    setGame(newGame)
    window.history.pushState({}, '', `/jogo/${data.id}`)
  }

  function startEditingGame() {
    setEditForm({
      title: game.title,
      location: game.location,
      date: game.date,
      time: game.time,
      price: game.price,
      maxPlayers: game.maxPlayers,
      pixKey: game.pixKey || '',
    })

    setIsEditingGame(true)
  }

  async function saveGameChanges(event) {
    event.preventDefault()

    const { error } = await supabase
      .from('games')
      .update({
        title: editForm.title,
        location: editForm.location,
        date: editForm.date,
        time: editForm.time,
        price: Number(editForm.price),
        max_players: Number(editForm.maxPlayers),
        pix_key: editForm.pixKey,
      })
      .eq('id', game.id)

    if (error) {
      alert('Erro ao salvar alterações: ' + error.message)
      return
    }

    setGame((currentGame) => ({
      ...currentGame,
      title: editForm.title,
      location: editForm.location,
      date: editForm.date,
      time: editForm.time,
      price: editForm.price,
      maxPlayers: editForm.maxPlayers,
      pixKey: editForm.pixKey,
    }))

    setIsEditingGame(false)
  }

  async function addPlayer(event) {
    event.preventDefault()
    if (!playerName.trim() || !game?.id) return

    const { data, error } = await supabase
      .from('players')
      .insert({
        game_id: game.id,
        name: playerName.trim(),
        confirmed: false,
        paid: false,
      })
      .select()
      .single()

    if (error) {
      alert('Erro ao adicionar jogador: ' + error.message)
      return
    }

    setGame((currentGame) => ({
      ...currentGame,
      players: [...currentGame.players, data],
    }))

    setPlayerName('')
  }

  async function updatePlayer(id, field, value) {
    const { error } = await supabase
      .from('players')
      .update({ [field]: value })
      .eq('id', id)

    if (error) {
      alert('Erro ao atualizar jogador: ' + error.message)
      return
    }

    setGame((currentGame) => ({
      ...currentGame,
      players: currentGame.players.map((player) =>
        player.id === id ? { ...player, [field]: value } : player
      ),
    }))
  }

  async function removePlayer(id) {
    const { error } = await supabase.from('players').delete().eq('id', id)

    if (error) {
      alert('Erro ao remover jogador: ' + error.message)
      return
    }

    setGame((currentGame) => ({
      ...currentGame,
      players: currentGame.players.filter((player) => player.id !== id),
    }))
  }

  function copyGameLink() {
    navigator.clipboard.writeText(window.location.href)
    alert('Link do jogo copiado!')
  }

  function generateWhatsAppMessage() {
    const paidPlayers = game.players.filter((p) => p.paid)
    const pendingPlayers = game.players.filter((p) => p.confirmed && !p.paid)
    const notConfirmedPlayers = game.players.filter((p) => !p.confirmed)

    const lines = [
      `⚽ *JOGO FÁCIL*`,
      '',
      `🏟️ *${game.title}*`,
      `📍 Local: ${game.location}`,
      `📅 Data: ${game.date}`,
      `🕒 Horário: ${game.time}`,
      `💰 Valor por jogador: R$ ${game.price}`,
      `👥 Vagas: ${game.maxPlayers}`,
      '',
      game.pixKey ? `🔑 *PIX do organizador:* ${game.pixKey}` : '',
      game.pixKey ? '' : '',
      '━━━━━━━━━━━━━━',
      '',
      `✅ *CONFIRMADOS E PAGOS (${paidPlayers.length})*`,
      '',
      paidPlayers.length
        ? paidPlayers.map((p, i) => `${i + 1}. ${p.name}`).join('\n')
        : 'Nenhum jogador pago ainda.',
      '',
      '━━━━━━━━━━━━━━',
      '',
      `⏳ *CONFIRMADOS PENDENTES (${pendingPlayers.length})*`,
      '',
      pendingPlayers.length
        ? pendingPlayers.map((p, i) => `${i + 1}. ${p.name}`).join('\n')
        : 'Nenhum pendente.',
      '',
      '━━━━━━━━━━━━━━',
      '',
      `❌ *NÃO CONFIRMARAM (${notConfirmedPlayers.length})*`,
      '',
      notConfirmedPlayers.length
        ? notConfirmedPlayers.map((p, i) => `${i + 1}. ${p.name}`).join('\n')
        : 'Todos confirmaram.',
      '',
      '━━━━━━━━━━━━━━',
      '',
      `📊 *RESUMO*`,
      '',
      `👥 Confirmados: ${summary.confirmed}`,
      `💰 Pagos: ${summary.paid}`,
      `⏳ Pendentes: ${summary.pending}`,
      `💵 Arrecadado: R$ ${summary.total}`,
      `⚽ Vagas livres: ${summary.freeSpots}`,
      '',
      '━━━━━━━━━━━━━━',
      '',
      `🔗 *Lista do jogo:*`,
      `${window.location.href}`,
      '',
      `Organizado pelo *Jogo Fácil*.`,
    ].filter(Boolean)

    const message = encodeURIComponent(lines.join('\n'))
    window.open(`https://wa.me/?text=${message}`, '_blank')
  }

  if (loading) {
    return (
      <main className="app">
        <section className="card">
          <h1>Carregando jogo...</h1>
        </section>
      </main>
    )
  }

  if (!game) {
    return (
      <main className="app">
        <section className="card">
          <span className="badge">MVP gratuito</span>
          <h1>Jogo Fácil</h1>
          <p>Crie um jogo, controle presença, pagamentos e envie a lista no WhatsApp.</p>

          <form onSubmit={createGame} className="form">
            <input placeholder="Nome do jogo" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <input placeholder="Local" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
            <input type="number" placeholder="Valor por jogador" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <input type="number" placeholder="Número de vagas" value={form.maxPlayers} onChange={(e) => setForm({ ...form, maxPlayers: e.target.value })} required />
            <input placeholder="Chave PIX do organizador" value={form.pixKey} onChange={(e) => setForm({ ...form, pixKey: e.target.value })} />

            <button type="submit">Criar jogo</button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="app">
      <section className="dashboard">
        <div className="top">
          <div>
            <span className="badge">Jogo criado</span>
            <h1>{game.title}</h1>
            <p>{game.location} • {game.date} • {game.time}</p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={startEditingGame} className="secondary">
              Editar jogo
            </button>

            <button onClick={copyGameLink} className="secondary">
              📋 Copiar link do jogo
            </button>

            <button onClick={() => {
              setGame(null)
              setIsEditingGame(false)
              window.history.pushState({}, '', '/')
            }} className="secondary">
              Novo jogo
            </button>
          </div>
        </div>

        {isEditingGame && (
          <form onSubmit={saveGameChanges} className="form" style={{ marginBottom: '24px' }}>
            <input
              placeholder="Nome do jogo"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              required
            />

            <input
              placeholder="Local"
              value={editForm.location}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              required
            />

            <input
              type="date"
              value={editForm.date}
              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
              required
            />

            <input
              type="time"
              value={editForm.time}
              onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
              required
            />

            <input
              type="number"
              placeholder="Valor por jogador"
              value={editForm.price}
              onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
              required
            />

            <input
              type="number"
              placeholder="Número de vagas"
              value={editForm.maxPlayers}
              onChange={(e) => setEditForm({ ...editForm, maxPlayers: e.target.value })}
              required
            />

            <input
              placeholder="Chave PIX do organizador"
              value={editForm.pixKey}
              onChange={(e) => setEditForm({ ...editForm, pixKey: e.target.value })}
            />

            <button type="submit">Salvar alterações</button>

            <button type="button" className="secondary" onClick={() => setIsEditingGame(false)}>
              Cancelar edição
            </button>
          </form>
        )}

        <div className="summary">
          <div><strong>{summary.confirmed}</strong><span>Confirmados</span></div>
          <div><strong>{summary.paid}</strong><span>Pagos</span></div>
          <div><strong>{summary.pending}</strong><span>Pendentes</span></div>
          <div><strong>R$ {summary.total}</strong><span>Arrecadado</span></div>
        </div>

        <form onSubmit={addPlayer} className="add-player">
          <input placeholder="Nome do jogador" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
          <button type="submit">Adicionar</button>
        </form>

        <div className="players">
          {game.players.map((player) => (
            <div className="player" key={player.id}>
              <div className="player-info">
                <strong>{player.name}</strong>

                <div className="player-status">
                  <span className={player.confirmed ? 'status confirmed' : 'status not-confirmed'}>
                    {player.confirmed ? '🟢 Confirmado' : '🔴 Não confirmado'}
                  </span>

                  <span className={player.paid ? 'status paid' : 'status not-paid'}>
                    {player.paid ? '💰 Pago' : '⛔ Não pago'}
                  </span>
                </div>
              </div>

              <div className="status-group">
                <button onClick={() => updatePlayer(player.id, 'confirmed', true)} className={player.confirmed ? 'ok' : ''}>Confirmou</button>
                <button onClick={() => updatePlayer(player.id, 'confirmed', false)} className={!player.confirmed ? 'danger' : ''}>Não confirmou</button>
                <button onClick={() => updatePlayer(player.id, 'paid', true)} className={player.paid ? 'ok' : ''}>Pagou</button>
                <button onClick={() => updatePlayer(player.id, 'paid', false)} className={!player.paid ? 'danger' : ''}>Não pagou</button>
                <button onClick={() => removePlayer(player.id)} className="remove">Remover</button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={generateWhatsAppMessage} className="whatsapp">
          📲 Enviar lista no WhatsApp
        </button>
      </section>
    </main>
  )
}

export default App