using Figurkoder.Domain;
using System;
using System.Diagnostics;
using System.Threading;
using Xunit;

namespace Figurkoder.UnitTests.Domain
{
    public class GameEngineFacts
    {
        [Fact]
        public void Start_GameStarts_CurrentEventTriggers()
        {
            // Arrange
            var game = new GameEngine();
            var currentReceived = new AutoResetEvent(false);
            game.Current += CurrentHandler;

            void CurrentHandler(object _, EventArgs e)
            {
                currentReceived.Set();
            }

            // Act
            game.Start(new Game { FlashTime = TimeSpan.FromMilliseconds(100) });

            // Assert
            Assert.True(currentReceived.WaitOne(TimeSpan.FromMilliseconds(10)));
        }

        [Fact]
        public void Start_TimesUp_CurrentEventTriggers()
        {
            // Arrange
            var currentCounter = 0;
            var game = new GameEngine();
            var sw = new Stopwatch();
            var currentReceived = new AutoResetEvent(false);
            game.GameStart += GameStartHandler;
            game.Current += CurrentHandler;

            void GameStartHandler(object _, EventArgs e)
            {
                sw.Start();
            }
            void CurrentHandler(object _, EventArgs e)
            {
                currentCounter++;

                if (currentCounter == 2)
                {
                    sw.Stop();
                    currentReceived.Set();
                }
            }

            // Act
            game.Start(new Game { FlashTime = TimeSpan.FromMilliseconds(100) });

            // Assert
            currentReceived.WaitOne(TimeSpan.FromMilliseconds(115));
            Assert.InRange(sw.Elapsed, TimeSpan.FromMilliseconds(85), TimeSpan.FromMilliseconds(115)); // Allow ±15ms
        }
    }
}
