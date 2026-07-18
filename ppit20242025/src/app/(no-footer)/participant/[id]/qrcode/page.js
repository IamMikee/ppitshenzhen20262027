import ParticipantQRCode from '../../../../Components/ParticipantQRCode';

export default function ParticipantQRCodePage({ params }) {
  const { id: participantId } = params;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-6 text-center">Participant QR Code</h2>
        <div className="flex justify-center">
          <ParticipantQRCode participantId={participantId} />
        </div>
      </div>
    </div>
  );
} 