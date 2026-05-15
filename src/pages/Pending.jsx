function Pending() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">
          ⏳ Waiting for Admin Approval
        </h1>
        <p className="text-gray-500 mt-2">
          You will be able to login once approved.
        </p>
      </div>
    </div>
  );
}

export default Pending;