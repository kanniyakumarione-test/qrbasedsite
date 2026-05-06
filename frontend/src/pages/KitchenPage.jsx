import OrdersView from '../components/OrdersView';

export default function KitchenPage() {
  return (
    <OrdersView
      title="Kitchen Dashboard"
      mode="kitchen"
      buttonText={(status) => (status === 'NEW' ? 'Start Preparing' : status === 'PREPARING' ? 'Mark Ready' : 'Ready')}
      disabledStatusCheck={(status) => status === 'READY'}
    />
  );
}
