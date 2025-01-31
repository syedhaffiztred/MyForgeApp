namespace MyForgeApp.Models
{
    public partial class APS
    {
        private readonly string _clientID;
        private readonly string _clientSecret;
        private readonly string _bucket;

        public APS(string clientID, string clientSecret, string bucket = null)
        {
            _clientID = clientID;
            _clientSecret = clientSecret;
            _bucket = string.IsNullOrEmpty(bucket) ? string.Format("{0}-basic-app", _clientID.ToLower()): bucket;
        }
    }
}
