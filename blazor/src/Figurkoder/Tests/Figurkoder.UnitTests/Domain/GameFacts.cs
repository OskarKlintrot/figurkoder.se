using Figurkoder.Domain;
using System;
using System.Diagnostics;
using System.Threading;
using Xunit;

namespace Figurkoder.UnitTests.Domain
{
    public class GameFacts
    {
        [Fact]
        public void Start_GameStarts_ShowNextEventTriggers()
        {
            // Arrange
            var game = new Game();
            var sw = new Stopwatch();
            var showNextReceived = new AutoResetEvent(false);
            game.GameStart += GameStartHandler;
            game.ShowNext += ShowNextHandler;

            void GameStartHandler(object _, EventArgs e)
            {
                sw.Start();
            }
            void ShowNextHandler(object _, EventArgs e)
            {
                sw.Stop();
                showNextReceived.Set();
            }

            // Act
            game.Start(new NewGame { FlashTime = TimeSpan.FromMilliseconds(100) });

            // Assert
            showNextReceived.WaitOne(TimeSpan.FromMilliseconds(115));
            Assert.InRange(sw.Elapsed, TimeSpan.FromMilliseconds(85), TimeSpan.FromMilliseconds(115)); // Allow ±15ms
        }
    }
}
