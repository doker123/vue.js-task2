const {createApp} = Vue;

const NoteColumn = {
    props: {
        columnId: {
            type: Number,
            required: true,
        },
        cards: {
            type: Array,
            required: true,
        },
        maxCount: {
            type: Number,
            required: false,
        }
    },
    events: ['update-item'],
    methods: {
        handleUpdateItem(cardId, ItemIndex, done) {
            this.emit('update-item', cardId, ItemIndex, done);
        },
        handleRemoveCard(cardId) {
            const index = this.cards.findIndex(c => c.id === cardId);
            if (index > -1) {
                this.cards.splice(index, 1);
            }
        }
    },
    template: `
    <div class="note-column">
      <h2>Колонка {{ columnId }} (макс. {{ maxCount }})</h2>
      <div class="cards-list">
        
      </div>
      <p
        v-if="cards.length >= maxCount"
        class="limit-warning"
      >
        Лимит достигнут ({{ maxCount }} карточек)
      </p>
    </div>
  `
};

const App = {
    data() {
        return {

            columns: [
                {id: 1, max: 3, cards: []},
                {id: 2, max: 5, cards: []},
                {id: 3, max: Infinity, cards: []}
            ],
            title: '',
            items: ['', '', '', '', ''],
            errorMessage: '',
            itemCount: 5
        };
    },
    methods: {
        load() {
            const saved = localStorage.getItem('notes');
            if (saved) {
                try {
                    this.columns = JSON.parse(saved);
                } catch (e) {
                    console.error('Error loading from localStorage:', e);
                }
            }
        },
        save() {
            try {
                localStorage.setItem('notes', JSON.stringify(this.columns));
            } catch (e) {
                console.error('Error saving to localStorage:', e);
            }
        },
        addCard() {
            const hasTitle = this.title.trim().length > 0;
            const filledItems = this.items
                .filter(item => item.trim())
                .slice(0, 5);

            this.errorMessage = '';

            if (!hasTitle) {
                this.errorMessage = 'Заполните заголовок карточки.';
                return;
            }
            if (filledItems.length < 3) {
                this.errorMessage = 'Добавьте минимум 3 пункта списка.';
                return;
            }

            const column = this.columns.find(col => col.id === 1);
            if (!column) {
                this.errorMessage = 'Колонка не найдена.';
                return;
            }
            if (column.cards.length >= column.max) {
                this.errorMessage = 'В первом столбце уже 3 карточки — нельзя добавить больше.';
                return;
            }

            const card = {
                id: Date.now() + Math.random().toString(36).substr(2, 10),
                title: this.title.trim(),
                items: filledItems.map(item => ({
                    text: item.trim(),
                    done: false
                })),
                completedAt: null
            };

            column.cards.push(card);
            this.title = '';
            this.items = ['', '', '', '', ''];
            this.save();
        },
        moveToColumn(card, targetColumnId) {
            for (const column of this.columns) {
                const index = column.cards.findIndex(c => c.id === card.id);
                if (index !== -1) {
                    column.cards.splice(index, 1);
                    break;
                }
            }

            const target = this.columns.find(col => col.id === targetColumnId);
            if (target) {
                target.cards.push(card);
                document.body.classList.remove('column-locked');
                this.save();
            } else {
                console.warn(`Колонка с id=${targetColumnId} не найдена.`);
            }
        },

        checkCardProgress(card, currentColumnId) {
            const total = card.items.length;
            if (total === 0) return false;
            const done = card.items.filter(item => item.done).length;
            const progress = done / total;
            if (progress >= 1) {
                card.completedAt = new Date().toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                this.moveToColumn(card, 3);
                return true;
            }
            if (progress > 0.5 && currentColumnId === 1) {
                const secondColumn = this.columns.find(col => col.id === 2);
                if (secondColumn && secondColumn.cards.length < secondColumn.max) {
                    this.moveToColumn(card, 2);
                } else {
                    document.body.classList.add('column-locked');
                }
            }
            return false;
        },
        updateItem(cardId, itemIndex, done) {
            for (const column of this.columns) {
                const card = column.cards.find(c => c.id === cardId);
                if (card && itemIndex >= 0 && itemIndex < card.items.length) {
                    card.items[itemIndex].done = done;
                    this.checkCardProgress(card, column.id);
                    this.save();
                    return;
                }
            }
        },

        clearAll() {
            this.columns = [
                {id: 1, max: 3, cards: []},
                {id: 2, max: 5, cards: []},
                {id: 3, max: Infinity, cards: []}
            ];
            this.save();
        }
    },
    mounted() {
        this.load();
    },
    template: `
  <div class="app">
    <h1>Заметки</h1>
    <div class="columns">
      
    </div>
    <button @click="clearAll" class="btn-clear">Очистить всё</button>
  </div>
  <div class="add-card">
      <input
        v-model="title"
        placeholder="Заголовок карточки"
        class="input-title"
      />
      <div v-for="n in 5" :key="n">
        <input
          v-if="n <= itemCount || title.trim()"
          v-model="items[n - 1]"
          :placeholder="'Пункт ' + n"
          class="input-item"
        />
      </div>
      <button @click="addCard" class="btn-add">Добавить карточку</button>
      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    </div>
`
};
createApp(App).mount('#app');