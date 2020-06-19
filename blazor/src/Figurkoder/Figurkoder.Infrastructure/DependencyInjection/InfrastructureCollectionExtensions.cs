using Figurkoder.Application.Queries;
using Figurkoder.Infrastructure.Queries;

namespace Microsoft.Extensions.DependencyInjection
{
    public static class InfrastructureCollectionExtensions
    {
        public static IServiceCollection AddInfrastructure(this IServiceCollection services)
        {
            return services
                .AddTransient<IMnemonicQueries, MnemonicQueries>();
        }
    }
}
