using Figurkoder.Domain;

namespace Microsoft.Extensions.DependencyInjection
{
    public static class DomainServiceCollectionExtensions
    {
        public static IServiceCollection AddDomain(this IServiceCollection services)
        {
            return services
                .AddTransient<GameEngineFactory>();
        }
    }
}
