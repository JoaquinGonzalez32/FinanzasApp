type Listener = () => void;

function createChannel() {
  const listeners = new Set<Listener>();
  return {
    on(fn: Listener): () => void {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    emit() {
      listeners.forEach((fn) => fn());
    },
  };
}

const transactions = createChannel();
const categories = createChannel();
const accounts = createChannel();

export const onTransactionsChange = transactions.on;
export const emitTransactionsChange = transactions.emit;
export const onCategoriesChange = categories.on;
export const emitCategoriesChange = categories.emit;
export const onAccountsChange = accounts.on;
export const emitAccountsChange = accounts.emit;

const budget = createChannel();
export const onBudgetChange = budget.on;
export const emitBudgetChange = budget.emit;

const accountGoals = createChannel();
export const onAccountGoalsChange = accountGoals.on;
export const emitAccountGoalsChange = accountGoals.emit;

const recurring = createChannel();
export const onRecurringChange = recurring.on;
export const emitRecurringChange = recurring.emit;
