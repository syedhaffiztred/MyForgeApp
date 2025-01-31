using Autodesk.Authentication;
using Autodesk.Authentication.Model;

namespace MyForgeApp.Models
{
    public record Token(string AccessToken, DateTime ExpiresAt);

    public partial class APS
    {
        private Token _internalTokenCache;
        private Token _publicTokenCache;

        private async Task<Token> GetToken(List<Scopes> scopes)
        {
            var authClient = new AuthenticationClient();
            var auth = await authClient.GetTwoLeggedTokenAsync(_clientID, _clientSecret, scopes);
            if (auth.ExpiresIn.HasValue)
            {
                return new Token(auth.AccessToken, DateTime.UtcNow.AddSeconds((double)auth.ExpiresIn.Value));
            }
            else
            {
                throw new InvalidOperationException("Token expiration time is not available.");
            }
        }

        public async Task<Token> GetPublicToken()
        {
            if (_publicTokenCache == null || _publicTokenCache.ExpiresAt < DateTime.UtcNow)
            {
                _publicTokenCache = await GetToken([Scopes.ViewablesRead]);
            }
            return _publicTokenCache;
        }

        private async Task<Token> GetInternalToken()
        {
            if (_internalTokenCache == null || _internalTokenCache.ExpiresAt < DateTime.UtcNow)
            {
                _internalTokenCache = await GetToken([Scopes.DataRead, Scopes.DataWrite, Scopes.DataCreate, Scopes.BucketCreate, Scopes.BucketRead]);
            }
            return _internalTokenCache;
        }
    }
}
