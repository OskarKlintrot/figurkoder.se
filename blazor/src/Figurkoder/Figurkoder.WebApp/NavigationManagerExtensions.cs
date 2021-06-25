using System;
using System.Diagnostics.CodeAnalysis;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.WebUtilities;

namespace Figurkoder.WebApp
{
    public static class NavigationManagerExtensions
    {
        public static bool TryGetQueryString<T>(this NavigationManager navManager, string key, [NotNullWhen(returnValue: true)] out T? value)
        {
            var uri = navManager.ToAbsoluteUri(navManager.Uri);

            if (QueryHelpers.ParseQuery(uri.Query).TryGetValue(key, out var valueFromQueryString))
            {
                value = SafeConvert<T>(valueFromQueryString, default);

                return value is not null;
            }

            value = default;
            return false;
        }

        private static T? SafeConvert<T>(string s, T? defaultValue)
        {
            return string.IsNullOrEmpty(s) ? defaultValue : (T)Convert.ChangeType(s, typeof(T));
        }
    }

}
