import { useNavigate, useParams } from 'react-router-dom';
import CardBuilderForm from '../components/cards/CardBuilderForm';

export default function CardBuilderPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <CardBuilderForm
        cardId={cardId}
        onSaved={() => navigate('/cards')}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
